#! /usr/bin/env node

import './instrument.js';
import 'dotenv/config';
import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import { fastify } from 'fastify';
import { Readable } from 'stream';
import { createRenderContext, Component, traverse, RenderElement, frames } from 'ai-jsx';
import { InvokeAgentRequest, Message } from './types.js';
import { FixieRequestWrapper } from './request-wrapper.js';

import { createRemoteJWKSet, jwtVerify } from 'jose';
import path from 'path';
import { isConversationMessage } from 'ai-jsx/core/conversation';

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

  const fixieApiUrl = process.env.FIXIE_API_URL ?? 'https://api.fixie.ai';

  const getJwks = createRemoteJWKSet(new URL('/.well-known/jwks.json', fixieApiUrl));

  app.addHook('onRequest', async (request, reply) => {
    try {
      const token = request.headers.authorization?.split(' ')[1];
      if (typeof token !== 'string') {
        throw new Error('Missing Authorization header');
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
      const invokeAgentRequest = req.body as InvokeAgentRequest;
      const renderable = (
        <FixieRequestWrapper
          request={invokeAgentRequest}
          fixieApiUrl={fixieApiUrl}
          fixieAuthToken={(req as any).fixieAuthToken}
          agentId={(req as any).fixieVerifiedToken.payload.aid}
        >
          <Handler {...(invokeAgentRequest.parameters ?? {})} />
        </FixieRequestWrapper>
      );

      const renderElement = createRenderContext().render(renderable);
      return res
        .status(200)
        .type('application/jsonl')
        .send(
          Readable.from(
            (async function* () {
              function renderElementToJson(renderElement: RenderElement): Message[] {
                const messages: Message[] = [];

                for (const [node, _] of traverse(renderElement, {
                  yield: isConversationMessage,
                  descend: (e) => !isConversationMessage(e),
                })) {
                  switch (node.type) {
                    case 'user':
                    case 'assistant':
                      messages.push({
                        kind: 'text',
                        state: node.isComplete() ? 'done' : 'in-progress',
                        content: node.toString(),
                        metadata: node.attributes.metadata,
                      });
                      break;
                    case 'system':
                      break;
                    case 'functionCall':
                      messages.push({
                        kind: 'functionCall',
                        id: node.attributes.id,
                        partial: !node.isComplete(),
                        name: node.attributes.name.toString(),
                        args: JSON.parse(node.toString()), // XXX/psalas: untruncate json
                        metadata: node.attributes.metadata,
                      });
                      break;
                    case 'functionResponse':
                      messages.push({
                        kind: 'functionResponse',
                        id: node.attributes.id,
                        failed: false, // XXX/psalas: propagate failure?
                        name: node.attributes.name.toString(),
                        response: node.toString(),
                        metadata: node.attributes.metadata,
                      });
                      break;
                  }
                }

                return messages;
              }

              let lastMessages: Message[] = [];
              try {
                for await (const frame of frames(renderElement)) {
                  lastMessages = renderElementToJson(frame);
                  yield `${JSON.stringify({
                    messages: lastMessages,
                    state: frame.isComplete() ? 'done' : 'in-progress',
                  })}\n`;
                }
              } catch (ex) {
                const errorDetail = `Error during generation: ${ex}${ex instanceof Error ? ` ${ex.stack}` : ''}`;
                console.error({ renderElement, errorDetail });
                yield `${JSON.stringify({ messages: lastMessages, errorDetail, state: 'error' })}\n`;
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
