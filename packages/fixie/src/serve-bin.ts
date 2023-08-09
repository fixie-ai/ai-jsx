#! /usr/bin/env node

import 'dotenv/config';
import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import { fastify, FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { ReadableStream, TextEncoderStream } from 'stream/web';
import { createRenderContext, Renderable } from 'ai-jsx';

class FixieMessage {
  constructor(public text: string) {}
}

class FixieRequest {
  constructor(public message: FixieMessage) {}
}

class FixieResponse {
  constructor(public message: FixieMessage) {}
}

function toMessageStream(renderable: Renderable) {
  const generator = createRenderContext().render(renderable)[Symbol.asyncIterator]();
  return new ReadableStream({
    async pull(controller) {
      const next = await generator.next();
      const response = new FixieResponse(new FixieMessage(next.value));
      controller.enqueue(`${JSON.stringify(response)}\n`);
      if (next.done) {
        controller.close();
      }
    },
  }).pipeThrough(new TextEncoderStream());
}

async function sendReadableStreamToFastifyReply(reply: FastifyReply, readableStream: ReadableStream) {
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

async function serve({
  packagePath,
  port,
  silentStartup,
}: {
  packagePath: string;
  port: number;
  silentStartup: boolean;
}): Promise<void> {
  const handler = (await import(packagePath)).default;
  const app: FastifyInstance = fastify();
  app.get('/', (req: FastifyRequest, res: FastifyReply) => {
    res.type('application/json').send({ type: 'standalone' });
  });
  app.post('/', async (req: FastifyRequest, res: FastifyReply) => {
    const body = req.body as FixieRequest;
    try {
      const messageStream = toMessageStream(handler({ message: body.message.text }));
      await sendReadableStreamToFastifyReply(res, messageStream);
    } catch (e: any) {
      console.error(e);
      res.status(500).send(e.message);
    }
  });

  const address = await app.listen({ host: '0.0.0.0', port });
  if (!silentStartup) {
    console.log(`AI.JSX agent listening on ${address}.`);
  }
}

const { argv } = yargs(hideBin(process.argv))
  .scriptName('cli-tool')
  .options({
    port: {
      describe: 'Port to listen on',
      type: 'number',
      required: true,
    },
    silentStartup: {
      describe: 'Do not log on startup',
      type: 'boolean',
      default: false,
    },
    packagePath: {
      describe:
        'Path to the package to serve functions from. If this is a relative path, it will be interpreted relative to the current working directory.',
      type: 'string',
      default: './index.js',
    },
  })
  .strict()
  .help()
  .epilog(
    'This is an internal tool used by the Fixie SDK. Developers building on Fixie are not intended to use this tool; they should use the `fixie` CLI tool instead.'
  );

/**
 * This is a little dance to make TS happy. We know that argv is not a Promise, based on how we wrote the yargs code,
 * based but TS doesn't.
 */
type ExcludePromiseType<T> = Exclude<T, Promise<any>>;
const staticArgv = argv as ExcludePromiseType<typeof argv>;

serve(staticArgv);
