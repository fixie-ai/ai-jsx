/**
 * Integrations with external logging services.
 * Currently only Weights and Biases is supported.
 * You can see examples package for an example with OpenTelemetry.
 * @packageDocumentation
 */
import { AsyncLocalStorage } from 'node:async_hooks';
import { v4 as uuidv4 } from 'uuid';
import { StatusCode, WBTraceTree, addChildSpan, wandb } from '@nick.heiner/wandb-fork';
import * as AI from '../index.js';
import { debug } from '../core/debug.js';

type WBSpan = Parameters<typeof addChildSpan>[0];

function bindAsyncGenerator<T = unknown, TReturn = any, TNext = unknown>(
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

/**
 * Exporting a forked version of wandb.
 * You need to import this version of wandb to use the integration.
 */
export { wandb };

/**
 * Weights and Biases logging integration for AI.JSX.
 * The tracer allows for the creation of a trace tree that can be visualized in the
 * Weights and Biases UI. To use it, wrap your application in a `WeightsAndBiasesTracer` component.
 *
 * NOTE: make sure to
 * 1. run `await wandb.init()` first and `await wandb.finish()` after rendering
 * 2. set the `WANDB_API_KEY` environment variable (in Node environments) and
 *    `sessionStorage.getItem("WANDB_API_KEY")` (in browser environments)
 * @see https://docs.wandb.ai/ref/js/ for more info.
 *
 * @example
 * ```tsx
 * await wandb.init();
 *
 * console.log(
 *   await AI.createRenderContext().render(
 *     <WeightsAndBiasesTracer>
 *       <CharacterGenerator />
 *     </WeightsAndBiasesTracer>
 *   )
 * );
 *
 * await wandb.finish();
 * ```
 */
export function WeightsAndBiasesTracer(props: { children: AI.Node }, { wrapRender }: AI.ComponentContext) {
  const currentSpanStorage = new AsyncLocalStorage<WBSpan>();
  const baseTime = new Date().valueOf() - performance.now();

  return AI.withContext(
    <>{props.children}</>,
    wrapRender((r) => (renderContext, renderable, shouldStop) => {
      if (!AI.isElement(renderable)) {
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
