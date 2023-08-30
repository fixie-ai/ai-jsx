#! /usr/bin/env node

import './instrument.js';
import 'dotenv/config';
import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import { fastify, FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { Readable } from 'stream';
import { createRenderContext } from 'ai-jsx';
import { InvokeAgentRequest } from './types.js';
import { FixieRequestWrapper } from './request-wrapper.js';

import { createRemoteJWKSet, jwtVerify } from 'jose';
import path from 'path';

async function serve({
  packagePath,
  port,
  silentStartup,
}: {
  packagePath: string;
  port: number;
  silentStartup: boolean;
}): Promise<void> {
  const Handler = (await import(path.join(process.cwd(), packagePath))).default;
  const app: FastifyInstance = fastify();

  const fixieApiHost = process.env.FIXIE_API_HOST ?? 'https://app.fixie.ai';

  const getJwks = createRemoteJWKSet(new URL(`${fixieApiHost}/.well-known/jwks.json`));

  app.addHook('onRequest', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const token = request.headers.authorization?.split(' ')[1];
      if (typeof token !== 'string') {
        reply.send(new Error('No authorization header'));
        return;
      }
      (request as any).verifiedToken = await jwtVerify(token, getJwks);
    } catch (err) {
      console.error(err);
      reply.send(err);
    }
  });

  app.get('/', (req: FastifyRequest, res: FastifyReply) => {
    res.type('application/json').send({ type: 'standalone' });
  });
  app.post('/', (req: FastifyRequest, res: FastifyReply) => {
    const body = req.body as InvokeAgentRequest;
    const authToken = req.headers.authorization!.split(' ')[1];

    try {
      const renderable = (
        <FixieRequestWrapper
          request={body}
          agentId={(req as any).verifiedToken.payload.aid}
          fixieApiHost={fixieApiHost}
          authToken={authToken}
        >
          <Handler />
        </FixieRequestWrapper>
      );
      const generator = createRenderContext({ enableOpenTelemetry: true }).render(renderable)[Symbol.asyncIterator]();
      return res
        .status(200)
        .type('application/jsonl')
        .send(
          Readable.from(
            (async function* () {
              while (true) {
                try {
                  const next = await generator.next();
                  const messages = next.value.split('\n').slice(0, -1);
                  yield `${JSON.stringify({ messages: messages.map((msg) => JSON.parse(msg)) })}\n`;
                  if (next.done) {
                    break;
                  }
                } catch (ex) {
                  console.error(`Error during generation: ${ex}`);
                  break;
                }
              }
            })()
          )
        );
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

serve(await argv);
