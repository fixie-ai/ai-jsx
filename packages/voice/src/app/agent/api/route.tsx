/** @jsxImportSource ai-jsx */
import { AssistantMessage, ChatCompletion, SystemMessage, UserMessage } from 'ai-jsx/core/completion';
import { FixieCorpus } from 'ai-jsx/batteries/docs';
import { OpenAI, ValidChatModel as OpenAIValidChatModel } from 'ai-jsx/lib/openai';
import { Anthropic, ValidChatModel as AnthropicValidChatModel } from 'ai-jsx/lib/anthropic';
import { StreamingTextResponse } from 'ai';
import { toTextStream } from 'ai-jsx/stream';
import { NextRequest } from 'next/server';
import { AgentConfig, getAgent } from '../agents';
import _ from 'lodash';

export const runtime = 'edge'; // 'nodejs' is the default

const MAX_CHUNKS = 4;

/**
 * The user and assistant messages exchanged by client and server.
 */
class ClientMessage {
  constructor(public role: string, public content: string) {}
}

/**
 * Makes a text stream that simulates LLM output from a specified string.
 */
function pseudoTextStream(text: string, interWordDelay = 0) {
  return new ReadableStream({
    async pull(controller) {
      const words = text.split(' ');
      for (let index = 0; index < words.length; index++) {
        const word = words[index];
        controller.enqueue(index > 0 ? ` ${word}` : word);
        if (interWordDelay > 0) {
          await new Promise((resolve) => setTimeout(resolve, interWordDelay));
        }
      }
      controller.close();
    },
  }).pipeThrough(new TextEncoderStream());
}

async function ChatAgent({
  agent,
  conversation,
  model,
  docs,
}: {
  agent: AgentConfig;
  conversation: ClientMessage[];
  model: string;
  docs?: number;
}) {
  const query = conversation.at(-1)?.content;
  let prompt = agent.prompt;
  if (docs && agent.corpusId && query) {
    const corpus = new FixieCorpus(agent.corpusId);
    const chunks = await corpus.search(query, { limit: MAX_CHUNKS });
    const chunkText = chunks.map((chunk) => chunk.chunk.content).join('\n');
    console.log(`Chunks:\n${chunkText}`);
    prompt += `\nHere is some relevant information that you can use to compose your response:\n\n${chunkText}\n`;
  }
  const children = (
    <ChatCompletion>
      <SystemMessage>{prompt}</SystemMessage>
      {conversation.map((message: ClientMessage) =>
        message.role == 'assistant' ? (
          <AssistantMessage>{message.content}</AssistantMessage>
        ) : (
          <UserMessage>{message.content}</UserMessage>
        )
      )}
    </ChatCompletion>
  );
  if (model.startsWith('gpt-')) {
    return <OpenAI chatModel={model as OpenAIValidChatModel}>{children}</OpenAI>;
  }
  if (model.startsWith('claude-')) {
    return <Anthropic chatModel={model as AnthropicValidChatModel}>{children}</Anthropic>;
  }
  throw new Error(`Unknown model: ${model}`);
}

export async function POST(request: NextRequest) {
  const json = await request.json();
  console.log(`New request (agentId=${json.agentId} model=${json.model} docs=${json.docs})`);
  json.messages.forEach((message: ClientMessage) => console.log(`role=${message.role} content=${message.content}`));

  const agent = getAgent((json.agentId as string) ?? 'dr-donut');
  if (!agent) {
    throw new Error(`Unknown agent: ${json.agentId}`);
  }

  let stream;
  if (json.messages.length == 1 && !json.messages[0].content) {
    const initialResponse = _.sample(agent.initialResponses)!;
    stream = pseudoTextStream(initialResponse);
  } else {
    stream = toTextStream(<ChatAgent agent={agent} conversation={json.messages} model={json.model} docs={json.docs} />);
  }
  return new StreamingTextResponse(stream);
}
