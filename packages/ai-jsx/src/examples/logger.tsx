import { LLMx } from '../lib/index.ts';
import { Completion } from '../lib/completion-components.tsx';
import { Inline } from '../lib/inline.tsx';
import { debug } from '../lib/debug.tsx';

function Log(props: { children: LLMx.Node }, ctx: LLMx.RenderContext) {
  // A component that hooks RenderContext to log instrumentation to stderr.
  return LLMx.withContext(
    <>{props.children}</>,
    ctx.wrapRender(
      (r) =>
        async function* (ctx, renderable, shouldStop) {
          const start = performance.now();
          try {
            return yield* r(ctx, renderable, shouldStop);
          } finally {
            const end = performance.now();
            if (LLMx.isElement(renderable)) {
              console.error(`Finished rendering ${debug(renderable, false)} (${end - start}ms @ ${end})`);
            }
          }
        }
    )
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

console.log(
  await LLMx.createRenderContext().render(
    <Log>
      <CharacterGenerator />
    </Log>
  )
);
