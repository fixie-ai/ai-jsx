import { showInspector } from '@fixieai/ai-jsx/core/inspector';
import { Inline } from '@fixieai/ai-jsx/core/inline';
import * as LLMx from '@fixieai/ai-jsx';
import { Node } from '@fixieai/ai-jsx';
import { Completion } from '@fixieai/ai-jsx/core/completion';

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
