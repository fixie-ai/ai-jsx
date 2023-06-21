/**
 * This code is a Vercel Edge Function that proxies requests to the OpenAI API.
 * This is used to protect your OpenAI API key from being exposed to the client.
 * Code is adapted from: https://sdk.vercel.ai/
 */

// We are using @nick.heiner/openai-edge here because the current openai-edge
// package is lacking TypeScript type declarations.
// TODO: Remove this hack once openai-edge has been updated.
import { Configuration, OpenAIApi } from '@nick.heiner/openai-edge';
import { OpenAIStream, StreamingTextResponse } from 'ai';

export const runtime = 'edge';

const apiConfig = new Configuration({
  apiKey: process.env.OPENAI_API_KEY!,
});

const openai = new OpenAIApi(apiConfig);

export async function POST(req: Request) {
  // Extract the `messages` from the body of the request
  const request = await req.json();
  const temperature = request.temperature ?? 0.7;
  const top_p = request.top_p ?? 1;
  const frequency_penalty = request.frequency_penalty ?? 1;
  const presence_penalty = request.presence_penalty ?? 1;
  const max_tokens = request.max_tokens ?? 500;
  const messages = request.messages ?? [];

  // Request the OpenAI API for the response based on the prompt
  const response = await openai.createChatCompletion({
    model: 'gpt-3.5-turbo',
    stream: true,
    messages: messages,
    max_tokens: max_tokens,
    temperature: temperature,
    top_p: top_p,
    frequency_penalty: frequency_penalty,
    presence_penalty: presence_penalty,
  });

  // Convert the response into a friendly text-stream
  const stream = OpenAIStream(response);

  // Respond with the stream
  return new StreamingTextResponse(stream);
}
