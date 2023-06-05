import { LLMx } from '../lib/index.ts';
import { Completion } from '../lib/completion-components.tsx';
import { Inline, Scope } from '../lib/inline.tsx';

function Log(props: { children: LLMx.Node }, ctx: LLMx.RenderContext) {
  // A component that hooks RenderContext to log instrumentation to stderr.
  return LLMx.withContext(
    <>{props.children}</>,
    ctx.wrapRender(
      (r) =>
        async function* (ctx, renderable, shouldStop) {
          const start = performance.now();
          yield* r(ctx, renderable, shouldStop);
          const end = performance.now();
          if (LLMx.isElement(renderable)) {
            console.error(`Finished rendering ${LLMx.debug(renderable, false)} (${end - start}ms @ ${end})`);
          }
        }
    )
  );
}

function CharacterGenerator() {
  const inlineCompletion = (
    <Inline>
      {(prompt) => (
        <Completion stop={['"']} temperature={1.0}>
          {prompt}
        </Completion>
      )}
    </Inline>
  );

  return (
    <Scope>
      The following is a character profile for an RPG game in JSON format:{'\n'}
      {'{'}
      {'\n  '}"class": "{inlineCompletion}",
      {'\n  '}"name": "{inlineCompletion}",
      {'\n  '}"mantra": "{inlineCompletion}"{'\n'}
      {'}'}
    </Scope>
  );
}

LLMx.show(
  <Log>
    <CharacterGenerator />
  </Log>,
  { stream: false, step: false }
);
