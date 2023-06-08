import * as LLMx from '@fixieai/ai-jsx';
import { Completion } from '@fixieai/ai-jsx/core/completion';
import { Inline } from '../lib/inline.tsx';
import { debug } from '@fixieai/ai-jsx/core/debug';

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
            console.error(`Finished rendering ${debug(renderable, false)} (${end - start}ms @ ${end})`);
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
  LLMx.createRenderContext().render(
    <Log>
      <CharacterGenerator />
    </Log>
  )
);
