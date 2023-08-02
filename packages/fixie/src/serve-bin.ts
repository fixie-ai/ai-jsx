#! /usr/bin/env node

import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import { fastify, FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { toTextStream } from 'ai-jsx/stream';
import index from './index.js';

async function serve({ port, silentStartup }: { port: number; silentStartup: boolean }): Promise<void> {
  // const handler = await import(packagePath);
  const handler = index;
  const app: FastifyInstance = fastify();
  app.post('/', (req: FastifyRequest, res: FastifyReply) => {
    const body = req.body as { message: { text: string } };
    try {
      res.send(toTextStream(handler({ message: body.message.text })));
    } catch (e: any) {
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
