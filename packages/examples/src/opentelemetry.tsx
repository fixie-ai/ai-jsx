import opentelemetry from '@opentelemetry/api';
import { NodeSDK } from '@opentelemetry/sdk-node';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-proto';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { AsyncLocalStorageContextManager } from '@opentelemetry/context-async-hooks';
import * as AI from 'ai-jsx';
import { Completion } from 'ai-jsx/core/completion';
import { Inline } from 'ai-jsx/core/inline';
import { debug } from 'ai-jsx/core/debug';
import { AsyncLocalStorage } from 'node:async_hooks';

export function bindAsyncGenerator<T = unknown, TReturn = any, TNext = unknown>(
  generator: AsyncGenerator<T, TReturn, TNext>
): AsyncGenerator<T, TReturn, TNext> {
  const result = {
    next: AsyncLocalStorage.bind(generator.next.bind(generator)),
    return: AsyncLocalStorage.bind(generator.return.bind(generator)),
    throw: AsyncLocalStorage.bind(generator.throw.bind(generator)),

    [Symbol.asyncIterator]() {
      return result;
    },
  };

  return result;
}

function OpenTelemetryTracer(props: { children: AI.Node }, { wrapRender }: AI.ComponentContext) {
  return AI.withContext(
    <>{props.children}</>,
    wrapRender((r) => {
      const tracer = opentelemetry.trace.getTracer('ai.jsx');
      return (renderContext, renderable, shouldStop) =>
        AI.isElement(renderable)
          ? tracer.startActiveSpan(
              `<${renderable.tag.name}>`,
              { attributes: { 'ai.jsx.tag': renderable.tag.name, 'ai.jsx.tree': debug(renderable, true) } },
              (span: opentelemetry.Span) => {
                async function* gen() {
                  try {
                    return yield* r(renderContext, renderable, shouldStop);
                  } finally {
                    span.end();
                  }
                }

                return bindAsyncGenerator(gen());
              }
            )
          : r(renderContext, renderable, shouldStop);
    })
  );
}

function CharacterGenerator() {
  const inlineCompletion = (prompt: AI.Node) => (
    <Completion stop={['"']} temperature={1.0}>
      {prompt}
    </Completion>
  );

  return (
    <Inline>
      The following is a character profile for an RPG game in JSON format:{'\n'}
      {'{'}
      {'\n  '}"class": "{inlineCompletion}",
      {'\n  '}"name": "{inlineCompletion}",
      {'\n  '}"mantra": "{inlineCompletion}"{'\n'}
      {'}'}
    </Inline>
  );
}

console.log(
  `This demo shows how tree rendering can be traced with OpenTelemetry. To view traces with Jaeger you can use:

docker run -d --name jaeger \\
        -e COLLECTOR_ZIPKIN_HOST_PORT=:9411 \\
        -e COLLECTOR_OTLP_ENABLED=true \\
        -p 6831:6831/udp \\
        -p 6832:6832/udp \\
        -p 5778:5778 \\
        -p 16686:16686 \\
        -p 4317:4317 \\
        -p 4318:4318 \\
        -p 14250:14250 \\
        -p 14268:14268 \\
        -p 14269:14269 \\
        -p 9411:9411 \\
        jaegertracing/all-in-one:latest

Which bundles everything into one docker container that you can view at http://localhost:16686/
See https://www.jaegertracing.io/docs/1.46/getting-started/ for more.
`
);
const sdk = new NodeSDK({
  contextManager: new AsyncLocalStorageContextManager(),
  traceExporter: new OTLPTraceExporter(),
  instrumentations: [getNodeAutoInstrumentations()],
  serviceName: 'ai.jsx-demo',
});

sdk.start();

console.log(
  await AI.createRenderContext().render(
    <OpenTelemetryTracer>
      <CharacterGenerator />
    </OpenTelemetryTracer>
  )
);

await sdk.shutdown();
