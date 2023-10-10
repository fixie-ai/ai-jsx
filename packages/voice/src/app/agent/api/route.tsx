/** @jsxImportSource ai-jsx */
import { AssistantMessage, ChatCompletion, SystemMessage, UserMessage } from 'ai-jsx/core/completion';
import { FixieCorpus } from 'ai-jsx/batteries/docs';
import { OpenAI, ValidChatModel as OpenAIValidChatModel } from 'ai-jsx/lib/openai';
import { Anthropic, ValidChatModel as AnthropicValidChatModel } from 'ai-jsx/lib/anthropic';
import { StreamingTextResponse } from 'ai';
import { toTextStream } from 'ai-jsx/stream';
import { NextRequest } from 'next/server';
import _ from 'lodash';

export const runtime = 'edge'; // 'nodejs' is the default

const DD_PROMPT = `
You are a drive-thru order taker for a donut shop called "Dr. Donut". Local time is currently: ${new Date().toLocaleTimeString()}
Respond according to the following script:
1. Greet the user using a time-appropriate greeting based on their local time, e.g., "Good afternoon, what can I get started for you today?",
2. Take their order, acknowledging each item as it is ordered. If it's not clear which menu item the user is ordering, ask them to clarify. 
   DO NOT add an item to the order unless it's one of the items on the menu below.
3. Once the order is complete, repeat back the order.
3a. If the user only ordered a drink, ask them if they would like to add a donut to their order.
3b. If the user only ordered donuts, ask them if they would like to add a drink to their order.
3c. If the user ordered both drinks and donuts, don't suggest anything.
4. Total up the price of all ordered items and inform the user.
5. Ask the user to pull up to the drive thru window. 
If the user says something that you don't understand, ask them to repeat themselves.
If the user asks for something that's not on the menu, inform them of that fact, and suggest the most similar item on the menu.
If the user says something unrelated to your role, responed with "Sir... this is a Dr. Donut."
If the user says "thank you", respond with "My pleasure."
When speaking with the user, be concise, keep your responses to a single sentence when possible.
If the user asks about what's on the menu, DO NOT read the entire menu to them. Instead, give a couple suggestions.

The menu of available items is as follows:

# DONUTS

PUMPKIN SPICE ICED DOUGHNUT $1.29
PUMPKIN SPICE CAKE DOUGHNUT $1.29
OLD FASHIONED DOUGHNUT $1.29
CHOCOLATE ICED DOUGHNUT $1.09
CHOCOLATE ICED DOUGHNUT WITH SPRINKLES $1.09
RASPBERRY FILLED DOUGHNUT $1.09
BLUEBERRY CAKE DOUGHNUT $1.09
STRAWBERRY ICED DOUGHNUT WITH SPRINKLES $1.09
LEMON FILLED DOUGHNUT $1.09
DOUGHNUT HOLES $3.99

# COFFEE & DRINKS 

PUMPKIN SPICE COFFEE $2.59
PUMPKIN SPICE LATTE $4.59
REGULAR BREWED COFFEE $1.79
DECAF BREWED COFFEE $1.79
LATTE $3.49
CAPPUCINO $3.49
CARAMEL MACCHIATO $3.49
MOCHA LATTE $3.49
CARAMEL MOCHA LATTE $3.49
`;

const DD_INITIAL_RESPONSES = [
  'Welcome to Dr. Donut! What can I get started for you today?',
  'Hi, thanks for choosing Dr. Donut! What would you like to order?',
  "Howdy! Welcome to Dr. Donut. What'll make your day?",
  'Welcome to Dr. Donut, home of the best donuts in town! How can I help you?',
  'Greetings from Dr. Donut! What can we make fresh for you today?',
  'Hello and welcome to Dr. Donut! Are you ready to order?',
  'Hi there! Dr. Donut at your service. What would you like today?',
  'Hi, the doctor is in! What can we get for you today?',
];

/**
 * The id of the corpus, from https://console.fixie.ai.
 */
const DD_CORPUS_ID = 'bd69dce6-7b56-4d0b-8b2f-226500780ebd';
const MAX_CHUNKS = 4;

const LC_PROMPT = `You are a coach helping students learn to speak Spanish. Talk to them in basic Spanish, but
correct them in English if they say something that's not quite right.
Respond according to the following script:
1. Greet the student, and ask them how they are doing.
2. Ask them what they did today.
3. Ask followup questions based on the above.
`;

const LC_INITIAL_RESPONSES = [
  'Hola, ¿cómo estás?',
  'Hola, ¿qué tal?',
  'Hola, ¿qué pasa?',
  'Hola, ¿qué haces?',
  'Hola, ¿qué hiciste hoy?',
];

const RUBBER_DUCK = `You are a rubber duck. Your job is to listen to the user's problems and concerns and respond with responses
designed to help the user solve their own problems. You are not a therapist, and you are not a friend. You are a rubber duck.
`;

const RD_INITIAL_RESPONSES = [
  "Hi, what's on your mind?",
  'Hi, how are you today?',
  'Hi! What can I help you with?',
  'Anything you want to talk about?',
  "What's new?",
];

interface AgentPersona {
  prompt: string;
  initialResponses: string[];
  corpusId: string;
}

const PERSONAS: Record<string, AgentPersona> = {
  dd: { prompt: DD_PROMPT, initialResponses: DD_INITIAL_RESPONSES, corpusId: DD_CORPUS_ID },
  lc: { prompt: LC_PROMPT, initialResponses: LC_INITIAL_RESPONSES, corpusId: '' },
  rd: { prompt: RUBBER_DUCK, initialResponses: RD_INITIAL_RESPONSES, corpusId: '' },
};

/**
 * The user and assistant messages exchanged by client and server.
 */
class ClientMessage {
  constructor(public role: string, public content: string) {}
}

/**
 * Creates an initial response from the agent.
 */
function sample(initialResponses: string[]) {
  return initialResponses[Math.floor(Math.random() * initialResponses.length)];
}

/**
 * Makes a text stream that simulates LLM output from a specified string.
 */
function pseudoTextStream(text: string, interWordDelay = 20) {
  return new ReadableStream({
    async pull(controller) {
      const words = text.split(' ');
      for (let index = 0; index < words.length; index++) {
        const word = words[index];
        controller.enqueue(index > 0 ? ` ${word}` : word);
        await new Promise((resolve) => setTimeout(resolve, interWordDelay));
      }
      controller.close();
    },
  }).pipeThrough(new TextEncoderStream());
}

async function ChatAgent({
  persona,
  conversation,
  model,
  docs,
}: {
  persona: AgentPersona;
  conversation: ClientMessage[];
  model: string;
  docs?: number;
}) {
  const query = conversation.at(-1)?.content;
  let prompt = persona.prompt;
  if (docs && query) {
    const corpus = new FixieCorpus(persona.corpusId);
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
  console.log(`New request (persona=${json.persona} model=${json.model} docs=${json.docs})`);
  json.messages.forEach((message: ClientMessage) => console.log(`role=${message.role} content=${message.content}`));

  const personaId = json.personaId as string;
  const persona = PERSONAS[personaId ?? 'dd'];
  let stream;
  if (json.messages.length == 1 && !json.messages[0].content) {
    stream = pseudoTextStream(_.sample(persona.initialResponses));
  } else {
    stream = toTextStream(
      <ChatAgent persona={persona} conversation={json.messages} model={json.model} docs={json.docs} />
    );
  }
  return new StreamingTextResponse(stream);
}
