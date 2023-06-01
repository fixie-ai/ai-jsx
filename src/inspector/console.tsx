import { LLMx } from '../lib/index.ts';
import { useState, useEffect } from 'react';
import reactUse from 'react-use';
import { render, Text, useInput } from 'ink';
import { DebugTree } from '../lib/debug.tsx';

const { useList } = reactUse;

function Inspector({ componentToInspect }: { componentToInspect: any }) {
  const [steps, { push }] = useList([] as string[]);
  const [frameIndex, setFrameIndex] = useState(0);

  useEffect(() => {
    async function getAllFrames() {
      for await (const page of LLMx.renderStream(componentToInspect)) {
        push(page);
      }
      push(LLMx.debug(<DebugTree>{componentToInspect}</DebugTree>));
    }
    getAllFrames();
  }, [componentToInspect]);

  useInput((_input, key) => {
    if (key.return) {
      setFrameIndex((prevIndex) => Math.min(steps.length - 1, prevIndex + 1));
    }
  });

  return (
    <Text
      // @ts-expect-error
      react
      color="green"
    >
      {steps[frameIndex]} {frameIndex}
    </Text>
  );
}

export function showInspector(componentToInspect: unknown) {
  render(
    <Inspector
      // @ts-expect-error
      react
      componentToInspect={componentToInspect}
    />
  );
}
