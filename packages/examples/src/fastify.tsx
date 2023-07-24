import { JsonChatCompletion } from 'ai-jsx/batteries/constrained-output';
import { ChatCompletion, SystemMessage, UserMessage } from 'ai-jsx/core/completion';
import * as AI from 'ai-jsx';
import Fastify from 'fastify';
import { toTextStream } from 'ai-jsx/stream';
import { ReadableStream } from 'stream/web';

/**
 * To run this demo:
 *
 *    yarn workspace examples demo:fastify
 *
 * Then, in another terminal:
 *
 *    curl http://localhost:3001/
 *    curl http://localhost:3001/stream-sample --no-buffer
 */

const fastify = Fastify({
  logger: true,
});

function FantasyCharacter() {
  return (
    <JsonChatCompletion>
      <UserMessage>Generate a character for a fantasy game.</UserMessage>
    </JsonChatCompletion>
  );
}

fastify.get('/', (request, reply) => {
  reply.type('application/json').code(200);
  return AI.createRenderContext().render(<FantasyCharacter />);
});

fastify.get('/stream-sample', async (request, reply) => {
  function DescribeCharacter() {
    return (
      <ChatCompletion>
        <SystemMessage>
          Here is a character: <FantasyCharacter />
        </SystemMessage>
        <UserMessage>Describe the character in prose.</UserMessage>
      </ChatCompletion>
    );
  }
  const responseStream = toTextStream(<DescribeCharacter />);
  await sendReadableStreamToFastifyReply(reply, responseStream);
});

fastify.get('/standalone-stream-sample', async (request, reply) => {
  reply.status(200);

  /**
   * I'm not sure which of these we want.
   */
  reply.header('Content-Type', 'text/plain');
  // reply.header('Content-Type', 'application/octet-stream')

  /**
   * Construct a simple readable stream.
   */
  let chunkCount = 0;
  const readableStream = new ReadableStream({
    pull(controller) {
      controller.enqueue(`chunk ${chunkCount}`);
      if (chunkCount++ > 3) {
        controller.close();
      }
    },
  });

  /**
   * This doesn't work. I'm not sure why.
   */
  // return reply.send(readableStream);

  /**
   * This works – maybe Fastify only supports Node streams but not web standard streams?
   */
  // return reply.send(fs.createReadStream('./package.json'))

  /**
   * Here's a hack we can use.
   */
  await sendReadableStreamToFastifyReply(reply, readableStream);
});

async function sendReadableStreamToFastifyReply(reply: Fastify.FastifyReply, readableStream: ReadableStream) {
  const reader = readableStream.getReader();
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const { done, value } = await reader.read();
    if (done) {
      reply.raw.end();
      break;
    }
    reply.raw.write(value);
  }
}

fastify.listen({ port: 3001 }, (err, address) => {
  if (err) {
    throw err;
  }
  console.log(`Server is now listening on ${address}`);
});
