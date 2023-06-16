import express from 'express';
import { Configuration, OpenAIApi } from 'openai-edge';
import { OpenAIStream, streamToResponse } from 'ai';

const app = express();

// Create an OpenAI API client
const config = new Configuration({
  apiKey: process.env.OPENAI_API_KEY,
});
const openai = new OpenAIApi(config);

app.get('/api/chat', async (req, res) => {
  res.setHeader('Content-Type', 'text/plain');
  res.setHeader('Transfer-Encoding', 'chunked');

  const response = await openai.createCompletion({
    model: 'text-davinci-003',
    stream: true,
    max_tokens: 1000,
    prompt: 'List 20 dog names',
  });

  // Convert the response into a friendly text-stream
  const stream = OpenAIStream(response);

  // Respond with the stream
  // const str = new StreamingTextResponse(stream);
  streamToResponse(stream, res);
});

app.listen(4000, () => {
  console.log('Server listening on port 4000');
});
