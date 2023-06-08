import {
  Configuration,
  CreateChatCompletionResponse,
  CreateCompletionResponse,
  CreateEmbeddingRequest,
  OpenAIApi,
} from 'openai';
import log from './log';
import { Merge } from 'type-fest';
import EventEmitter from 'node:events';
import _ from 'lodash';
import GPT3Tokenizer from 'gpt3-tokenizer';
// const GPT3Tokenizer = require('gpt3-tokenizer') as typeof import('gpt3-tokenizer');

const configuration = new Configuration({
  apiKey: process.env.OPENAI_API_KEY,
});
const openai = new OpenAIApi(configuration);

export type OpenAICompletionParams = Merge<
  Parameters<typeof openai.createCompletion>[0],
  {
    model: string;
  }
>;
export type OpenAIChatParams = Merge<
  Parameters<typeof openai.createChatCompletion>[0],
  {
    model: string;
  }
>;

export type OpenAIEmbeddingModels = 'text-embedding-ada-002' | 'text-search-ada-doc-001';
export type EmbeddingParams = Merge<
  CreateEmbeddingRequest,
  {
    model: OpenAIEmbeddingModels;
  }
>;

/**
 * Idea: set maxTokens to be whatever the prompt leaves room for.
 *
 * If you set maxTokens to be too high, then you'll get a 400 error. The framework should explicitly tell the user
 * this might be what's happening.
 */

export interface ModelCallOptions {
  callName?: string;
}
export type ModelResponse = CreateChatCompletionResponse | CreateCompletionResponse;

export function openAIEmbed(params: EmbeddingParams) {
  return log.logPhase({ phase: 'embed', params }, () => openai.createEmbedding(params));
}

// The return type annotation here seems like it should be unnecessary.
export function openAIChat(
  params: OpenAIChatParams,
  opts: ModelCallOptions = {}
): Promise<CreateChatCompletionResponse> {
  if (params.stream) {
    throw new Error('Call openAIChat.stream instead of openAI for streaming mode');
  }
  const paramsToUse = omitKeysWithUndefinedValues(params);
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
openAIChat.stream = function (params: OpenAIChatParams, opts: ModelCallOptions = {}) {
  const paramsToUse = {
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
openAIChat.simpleStream = async function* (params: OpenAIChatParams, opts: ModelCallOptions = {}) {
  const paramsToUse = {
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

  const paramsToUse = omitKeysWithUndefinedValues(params);
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

openAICompletion.simple = async function* simple(params: OpenAICompletionParams, opts: ModelCallOptions = {}) {
  if (params.n) {
    throw new Error('simple only returns a single choice. Use stream for multiple choices.');
  }
  const response = await openAICompletion(params, opts);
  yield response.choices[0].text;
};

// Instead of async iterators, maybe we actually want to use streams.

openAICompletion.stream = function stream(params: OpenAICompletionParams, opts: ModelCallOptions = {}) {
  const paramsToUse = {
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

openAICompletion.simpleStream = async function* simpleStream(
  params: OpenAICompletionParams,
  opts: ModelCallOptions = {}
) {
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
      // I'm confident this is safe.
      // @ts-expect-error
      result[key] = value;
    }
  }
  return result as T;
}
async function* openAICallToAsyncIterator(
  openAIAPICall: () => ReturnType<typeof openai.createCompletion | typeof openai.createChatCompletion>,
  logOpts: any
) {
  const responseParts: any[] = [];
  const eventEmitter = new EventEmitter();
  let isDone = false;

  // This is busted from a logging perspective. `response.data` is not what the logger is expecting it to be.
  log.modelCall(logOpts, async () => {
    const response = await openAIAPICall();

    // As OpenAI's type docs note, it uses [server-sent events](https://developer.mozilla.org/en-US/docs/Web/API/Server-sent_events/Using_server-sent_events#event_stream_format).
    for await (const chunk of response.data as unknown as string[]) {
      const lines = _.compact(chunk.toString().split('\n'));
      for (const line of lines) {
        log.trace({ line }, 'Received line');
        const sliced = line.trim().slice('data: '.length);

        if (sliced === '[DONE]') {
          isDone = true;
          eventEmitter.emit('got-line');
          return response.data;
        }

        try {
          const parsed = JSON.parse(sliced);
          responseParts.push(parsed);
        } catch {
          /**
           * I'm not sure why we want to bail in this case, but it's what Peter had, which is as good a reason as any to
           * do something.
           */
          log.trace({ sliced }, 'Exiting because this line is not JSON');
          isDone = true;
          return response.data;
        } finally {
          eventEmitter.emit('got-line');
        }
      }
    }
    // TODO: handle errors
    return response.data;
  });

  while (true) {
    if (responseParts.length) {
      const nextResponseLine = responseParts.shift();
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

/**
 * This only works for OpenAI (?)
 */
export function logitBiasOfTokens(tokens: Record<string, number>) {
  // @ts-expect-error
  const tokenizer = new GPT3Tokenizer.default({ type: 'gpt3' });
  return Object.fromEntries(
    Object.entries(tokens).map(([token, bias]) => {
      const encoded = tokenizer.encode(token) as { bpe: number[]; text: string[] };
      if (encoded.bpe.length > 1) {
        throw new Error(
          `You can only set logit_bias for a single token, but "${bias}" is ${encoded.bpe.length} tokens.`
        );
      }
      return [encoded.bpe[0], bias];
    })
  );
}
