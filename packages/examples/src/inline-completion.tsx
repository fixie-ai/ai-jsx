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
      Generate a character profile for a fantasy role-playing game in JSON format.{'\n'}
      {'{'}
      {'\n  '}"name": "{inlineCompletion}",
      {'\n  '}"class": "{inlineCompletion}",
      {'\n  '}"race": "{inlineCompletion}",
      {'\n  '}"alignment": "{inlineCompletion}",
      {'\n  '}"weapons": "{inlineCompletion}",
      {'\n  '}"spells": "{inlineCompletion}",
      {'\n}'}
    </Inline>
  );
}
showInspector(<CharacterGenerator />, { showDebugTree: false });
