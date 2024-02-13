import { Inline, __ } from 'ai-jsx/core/inline';
import { Node } from 'ai-jsx';
import { Completion } from 'ai-jsx/core/completion';
import { showJSX } from './utils.js';

function CharacterGenerator() {
  function JsonString({ children }: { children: Node }) {
    return (
      <Completion stop={['"']} temperature={1.0}>
        {children}
      </Completion>
    );
  }

  return (
    <Inline>
      Generate a character profile for a fantasy role-playing game in JSON format.{'\n'}
      {'{'}
      {'\n  '}"name": "{__(JsonString)}",
      {'\n  '}"class": "{__(JsonString)}",
      {'\n  '}"race": "{__(JsonString)}",
      {'\n  '}"alignment": "{__(JsonString)}",
      {'\n  '}"weapons": "{__(JsonString)}",
      {'\n  '}"spells": "{__(JsonString)}",
      {'\n}'}
    </Inline>
  );
}
showJSX(<CharacterGenerator />);
