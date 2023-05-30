import { Configuration, CreateChatCompletionResponse, CreateCompletionResponse, OpenAIApi } from 'openai';
import log from './log';
import { Merge, ValueOf } from 'type-fest';
import EventEmitter from 'node:events';
import _ from 'lodash';

const configuration = new Configuration({
  apiKey: process.env.OPENAI_API_KEY,
});
const openai = new OpenAIApi(configuration);

export type SupportedCompletionModels = ValueOf<{
  [K in keyof typeof defaultCompletionParams]: keyof (typeof defaultCompletionParams)[K];
}>;
export type OpenAICompletionParams = Merge<
  Parameters<typeof openai.createCompletion>[0],
  {
    model: SupportedCompletionModels;
  }
>;

// See https://platform.openai.com/docs/models/model-endpoint-compatibility for which models support which endpoints.
export const defaultCompletionParams = {
  openai: {
    'text-davinci-003': {
      max_tokens: 4096,
      temperature: 0,
    },
  },
};

export type SupportedChatModels = ValueOf<{
  [K in keyof typeof defaultChatParams]: keyof (typeof defaultChatParams)[K];
}>;
export type OpenAIChatParams = Merge<
  Parameters<typeof openai.createChatCompletion>[0],
  {
    model: SupportedChatModels;
  }
>;

export const defaultChatParams = {
  openai: {
    'gpt-3.5-turbo': {
      max_tokens: 4096,
      temperature: 0,
    },
  },
};

/**
 * Idea: set maxTokens to be whatever the prompt leaves room for.
 */

export interface ModelCallOptions {
  callName?: string;
}
export type ModelResponse = CreateChatCompletionResponse | CreateCompletionResponse;

// The return type annotation here seems like it should be unnecessary.
export function openAIChat(
  params: OpenAIChatParams,
  opts: ModelCallOptions = {}
): Promise<CreateChatCompletionResponse> {
  if (params.stream) {
    throw new Error('Call openAIChat.stream instead of openAI for streaming mode');
  }
  const paramsToUse = {
    ...defaultChatParams.openai[params.model],
    ...omitKeysWithUndefinedValues(params),
  };
  const optsToUse = {
    callName: 'openai-chat',
    ...opts,
  };
  return log.modelCall({ params: paramsToUse, ...optsToUse }, async () => {
    const response = await openai.createChatCompletion(paramsToUse);
    // TODO: handle errors
    return response.data;
  });
}
openAIChat.stream = function(params: OpenAIChatParams, opts: ModelCallOptions) {
  const paramsToUse = {
    ...defaultChatParams.openai[params.model],
    ...omitKeysWithUndefinedValues(params),
    stream: true,
  };
  const optsToUse = {
    callName: 'openai-chat',
    ...opts,
  };
  return openAICallToAsyncIterator(() => openai.createChatCompletion(paramsToUse, { responseType: 'stream' }), {
    params: paramsToUse,
    ...optsToUse,
  });
};
openAIChat.simpleStream = async function* (params: OpenAIChatParams, opts: ModelCallOptions) {
  const paramsToUse = {
    ...defaultChatParams.openai[params.model],
    ...omitKeysWithUndefinedValues(params),
    stream: true,
  };
  // Is this necessary? Will the currently streaming message ever be anything other than the assistant?
  const currentlyStreamingMessage = {
    role: '',
    content: '',
  };
  for await (const chunk of openAIChat.stream(paramsToUse, opts)) {
    // We should double-check to make sure this is how the API works.
    if (chunk.choices[0].delta.role) {
      currentlyStreamingMessage.role = chunk.choices[0].delta.role;
      currentlyStreamingMessage.content = '';
      log.trace({ currentlyStreamingMessage }, 'Emitting partial message');
      yield currentlyStreamingMessage;
      continue;
    }
    if (chunk.choices[0].delta.content) {
      currentlyStreamingMessage.content += chunk.choices[0].delta.content;
      log.trace({ currentlyStreamingMessage }, 'Emitting partial message');
      yield currentlyStreamingMessage;
    }
    // It looks like, in the end of the message case, delta will be {}.
  }
};

// The return type annotation here seems like it should be unnecessary.
export function openAICompletion(
  params: OpenAICompletionParams,
  opts: ModelCallOptions
): Promise<CreateCompletionResponse> {
  if (params.stream) {
    throw new Error('Call openAI.stream instead of openAI for streaming mode');
  }
  // TODO: validate model. Omit chat models.

  const paramsToUse = {
    ...defaultCompletionParams.openai[params.model],
    ...omitKeysWithUndefinedValues(params),
  };
  const optsToUse = {
    callName: 'openai-completion',
    ...opts,
  };
  return log.modelCall({ params: paramsToUse, ...optsToUse }, async () => {
    const response = await openai.createCompletion(paramsToUse);
    // TODO: handle errors
    return response.data;
  });
}

openAICompletion.simple = async function* simple(params: OpenAICompletionParams, opts: ModelCallOptions) {
  if (params.n) {
    throw new Error('simple only returns a single choice. Use stream for multiple choices.');
  }
  const response = await openAICompletion(params, opts);
  yield response.choices[0].text;
};

// Instead of async iterators, maybe we actually want to use streams.

openAICompletion.stream = function stream(params: OpenAICompletionParams, opts: ModelCallOptions) {
  const paramsToUse = {
    ...defaultCompletionParams.openai[params.model],
    ...omitKeysWithUndefinedValues(params),
    stream: true,
  };
  const optsToUse = {
    callName: 'openai-chat',
    ...opts,
  };
  return openAICallToAsyncIterator(
    () =>
      openai.createCompletion(paramsToUse, {
        responseType: 'stream',
      }),
    { params: paramsToUse, ...optsToUse }
  );
};

openAICompletion.simpleStream = async function* simpleStream(params: OpenAICompletionParams, opts: ModelCallOptions) {
  if (params.n) {
    throw new Error('simpleStream only returns a single choice. Use stream for multiple choices.');
  }
  for await (const chunk of openAICompletion.stream(params, opts)) {
    yield chunk.choices[0].text;
  }
};

function omitKeysWithUndefinedValues<T extends Record<string | number | symbol, any>>(obj: T): T {
  const result = {};
  for (const [key, value] of Object.entries(obj)) {
    if (value !== undefined) {
      result[key] = value;
    }
  }
  return result as T;
}
async function* openAICallToAsyncIterator(
  openAIAPICall: () => ReturnType<typeof openai.createCompletion | typeof openai.createChatCompletion>,
  logOpts: any
) {
  const responseLines = [];
  const eventEmitter = new EventEmitter();
  let isDone = false;

  log.modelCall(logOpts, async () => {
    const response = await openAIAPICall();

    for await (const chunk of response.data) {
      const lines = _.compact(chunk.toString().split('\n'));
      for (const line of lines) {
        log.trace({ line }, 'Received line');
        const sliced = line.trim().slice('data: '.length);

        if (sliced === '[DONE]') {
          isDone = true;
          eventEmitter.emit('got-line');
          return;
        }

        try {
          const parsed = JSON.parse(sliced);
          responseLines.push(parsed);
        } catch {
          /**
           * I'm not sure why we want to bail in this case, but it's what Peter had, which is as good a reason as any to
           * do something.
           */
          log.trace({ sliced }, 'Exiting because this line is not JSON');
          isDone = true;
          return;
        } finally {
          eventEmitter.emit('got-line');
        }
      }
    }
    // TODO: handle errors
    return response.data;
  });

  while (true) {
    if (responseLines.length) {
      const nextResponseLine = responseLines.shift();
      log.trace({ nextResponseLine }, 'emitting line');
      yield nextResponseLine;
      continue;
    }
    // Eslint's control flow analysis is mistaken.
    /* eslint-disable-next-line @typescript-eslint/no-unnecessary-condition */
    if (isDone) {
      return;
    }
    await new Promise((resolve) => {
      eventEmitter.once('got-line', resolve);
    });
  }
}
