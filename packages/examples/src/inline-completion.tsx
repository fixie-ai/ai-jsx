import { showInspector } from 'ai-jsx/core/inspector';
import { Inline } from 'ai-jsx/core/inline';
import * as LLMx from 'ai-jsx';
import { Node } from 'ai-jsx';
import { Completion } from 'ai-jsx/core/completion';

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
