import * as LLMx from 'ai-jsx';
import { SystemMessage } from 'ai-jsx/core/completion';
import { DebugTree } from 'ai-jsx/core/debug';

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
    <DebugTree>
      <SystemMessages array={[1, 2, ['test'], <>Test</>]} number={1} fn={(x: number) => x + 1} suffix={'\n'}>
        {['You are helpful.', 'You do not use jargon.', 'You are polite.']}
      </SystemMessages>
    </DebugTree>
  );
}

const finalResult = await LLMx.createRenderContext().render(<App />, {
  map(frame) {
    console.log(`Frame:\n${frame}\n`);
  },
});
console.log(`Final:\n${finalResult}`);
