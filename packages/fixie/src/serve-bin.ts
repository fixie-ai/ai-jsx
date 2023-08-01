#! /usr/bin/env node

import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import { fastify, FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { ReadableStream } from 'stream/web';
import index from './index.js';

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
  //const handler = await import(packagePath);
  const handler = index;
  const app: FastifyInstance = fastify();
  app.post('/', async (req: FastifyRequest, res: FastifyReply) => {
    const body = req.body as { message: { text: string } };
    try {
      const responseStream = handler(body.message.text);
      await sendReadableStreamToFastifyReply(res, responseStream);
    } catch (e: any) {
      res.status(500).send(e.message);
    }
  });

  await app.listen({ port: port });
  if (!silentStartup) {
    console.log(`AI.JSX agent listening on port ${port}.`);
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
      default: '.',
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
