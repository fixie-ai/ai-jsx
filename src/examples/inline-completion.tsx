import { LLMx } from '../lib/index.ts';
import { Completion } from '../lib/completion-components.tsx';
import { Inline } from '../lib/inline.tsx';
import { showInspector } from '../inspector/console.tsx';

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
showInspector(<CharacterGenerator />);
