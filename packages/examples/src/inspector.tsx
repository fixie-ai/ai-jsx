import { showInspector } from '@fixieai/ai-jsx/core/inspector';
import * as LLMx from '@fixieai/ai-jsx';
import { SystemMessage, Completion } from '@fixieai/ai-jsx/core/completion';
import { Inline } from '@fixieai/ai-jsx/core/inline';

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
