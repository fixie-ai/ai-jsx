import { LLMx } from '../../ai-jsx/src/lib/index.js';
import { Completion } from '../../ai-jsx/src/core/completion.tsx';
import { Inline } from '../../ai-jsx/src/core/inline.tsx/index.ts';
import { showInspector } from '../../ai-jsx/src/inspector/console.js';

function CharacterGenerator() {
  const inlineCompletion = (prompt: Node) => (
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
showInspector(<CharacterGenerator />);
