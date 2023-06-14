import { AsyncLocalStorage } from 'node:async_hooks';
import { v4 as uuidv4 } from 'uuid';
import * as LLMx from 'ai-jsx';
import { Completion } from 'ai-jsx/core/completion';
import { Inline } from 'ai-jsx/core/inline';
import { StatusCode, WBTraceTree, addChildSpan, wandb } from '@nick.heiner/wandb-fork';
import { debug } from 'ai-jsx/core/debug';

type WBSpan = Parameters<typeof addChildSpan>[0];

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

function WeightsAndBiasesTracer(props: { children: LLMx.Node }, { wrapRender }: LLMx.ComponentContext) {
  const currentSpanStorage = new AsyncLocalStorage<WBSpan>();
  const baseTime = new Date().valueOf() - performance.now();

  return LLMx.withContext(
    <>{props.children}</>,
    wrapRender((r) => (renderContext, renderable, shouldStop) => {
      if (!LLMx.isElement(renderable)) {
        return r(renderContext, renderable, shouldStop);
      }

      const newSpan = {
        name: `<${renderable.tag.name}>`,
        start_time_ms: baseTime + performance.now(),
        span_id: uuidv4(),
        end_time_ms: null,
        status_code: null,
        status_message: null,
        attributes: {
          'ai.jsx-tag': renderable.tag.name,
          'ai.jsx-tree': debug(renderable, true),
        },
        results: null,
        child_spans: null,
        span_kind: null,
      };

      const parentSpan = currentSpanStorage.getStore();
      if (parentSpan) {
        addChildSpan(parentSpan, newSpan);
      }

      return currentSpanStorage.run(newSpan, () => {
        async function* gen() {
          const currentSpan = currentSpanStorage.getStore();
          try {
            const result = yield* r(renderContext, renderable, shouldStop);
            if (currentSpan) {
              currentSpan.status_code = StatusCode.SUCCESS;
            }
            return result;
          } catch (ex) {
            if (currentSpan) {
              currentSpan.status_code = StatusCode.ERROR;
              currentSpan.status_message = `${ex}`;
            }

            throw ex;
          } finally {
            // End the span.
            if (currentSpan) {
              currentSpan.end_time_ms = baseTime + performance.now();
              if (!parentSpan) {
                wandb.log({ langchain_trace: new WBTraceTree(currentSpan).toJSON() });
              }
            }
          }
        }

        return bindAsyncGenerator(gen());
      });
    })
  );
}

function CharacterGenerator() {
  const inlineCompletion = (prompt: LLMx.Node) => (
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

await wandb.init();

console.log(
  await LLMx.createRenderContext().render(
    <WeightsAndBiasesTracer>
      <CharacterGenerator />
    </WeightsAndBiasesTracer>
  )
);

await wandb.finish();
