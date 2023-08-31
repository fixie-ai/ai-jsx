#! /usr/bin/env node

import './instrument.js';
import 'dotenv/config';
import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import { fastify } from 'fastify';
import { Readable } from 'stream';
import { createRenderContext, Component } from 'ai-jsx';
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
  const module = await import(path.resolve(packagePath));
  const Handler: Component<any> | undefined = module.default;
  if (!Handler) {
    throw new Error(`Module at ${packagePath} has no default export. An AI.JSX component must be the default export.`);
  }
  if (typeof Handler !== 'function') {
    throw new Error(
      `Default export of module at ${packagePath} is not a function. An AI.JSX component must be the default export.`
    );
  }
  const app = fastify();

  const fixieApiUrl = process.env.FIXIE_API_URL ?? 'https://app.fixie.ai';

  const getJwks = createRemoteJWKSet(new URL(`${fixieApiUrl}/.well-known/jwks.json`));

  app.addHook('onRequest', async (request, reply) => {
    try {
      const token = request.headers.authorization?.split(' ')[1];
      if (typeof token !== 'string') {
        throw new Error('Missing Authorization header');
        return;
      }
      (request as any).fixieAuthToken = token;
      (request as any).fixieVerifiedToken = await jwtVerify(token, getJwks);
    } catch (err) {
      console.error(err);
      reply.code(401).send(err);
    }
  });

  app.get('/', (_, res) => {
    res.type('application/json').send({ type: 'standalone' });
  });

  app.post('/', (req, res) => {
    try {
      const renderable = (
        <FixieRequestWrapper
          request={req.body as InvokeAgentRequest}
          apiBaseUrl={fixieApiUrl}
          agentId={(req as any).fixieVerifiedToken.payload.aid}
          authToken={(req as any).fixieAuthToken}
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
                  console.error(`Error during generation: ${ex}${ex instanceof Error ? ' ' + ex.stack : ''}`);
                  break;
                }
              }
            })()
          )
        );
    } catch (e: any) {
      console.error(e);
      res.status(500).send(e);
    }
  });

  const address = await app.listen({ host: '0.0.0.0', port });
  if (!silentStartup) {
    console.log(`AI.JSX agent listening on ${address}.`);
  }
}

const { argv } = yargs(hideBin(process.argv))
  .scriptName('fixie-serve-bin')
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
        'Path to the package exporting the AI.JSX program. If this is a relative path, it will be interpreted relative to the current working directory.',
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
