import { showInspector } from '../../ai-jsx/src/inspector/console.js';
import { LLMx } from '../../ai-jsx/src/lib/index.js';
import { SystemMessage, Completion } from '../../ai-jsx/src/core/completion.tsx';
import { Inline } from '../../ai-jsx/src/core/inline.tsx/index.ts';

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

// A component that demonstrates a dynamically expanding tree with different types of props.
function SystemMessages(props: {
  prefix?: string;
  suffix?: string;
  array: any[];
  children: string[];
  number: number;
  fn: (x: any) => any;
}) {
  if (props.children.length == 0) {
    return <></>;
  }
  return (
    <>
      {props.prefix}
      <SystemMessage>{props.children[0]}</SystemMessage>
      {props.suffix}
      <SystemMessages {...props}>{props.children.slice(1)}</SystemMessages>
    </>
  );
}

function App() {
  return (
    <>
      <SystemMessages array={[1, 2, ['test'], <>Test</>]} number={1} fn={(x: number) => x + 1} suffix={'\n'}>
        {['You are helpful.', 'You do not use jargon.', 'You are polite.']}
      </SystemMessages>
      <CharacterGenerator />
    </>
  );
}

showInspector(<App />);
