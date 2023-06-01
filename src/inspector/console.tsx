import { LLMx } from '../lib/index.ts';
import { useState, useEffect } from 'react';
import reactUse from 'react-use';
import { Box, render, Text, useInput } from 'ink';
import { DebugTree } from '../lib/debug.tsx';
import SyntaxHighlight from './syntax-highlight.tsx';
import { memo } from '../lib/memoize.tsx';
import Spinner from './spinner.tsx';

const { useList } = reactUse;

function Inspector({ componentToInspect }: { componentToInspect: LLMx.Node }) {
  const [debugTreeSteps, { push: pushDebugTreeStep }] = useList([] as string[]);
  const [debugTreeFrameIndex, setDebugTreeFrameIndex] = useState(0);
  const [debugTreeStreamIsDone, setDebugTreeStreamIsDone] = useState(false);

  const [renderedContent, setRenderedContent] = useState('');

  const memoized = memo(componentToInspect);

  useEffect(() => {
    async function getAllFrames() {
      // This results in some duplicate pages.
      for await (const page of LLMx.renderStream(<DebugTree>{memoized}</DebugTree>)) {
        pushDebugTreeStep(page);
      }
      setDebugTreeStreamIsDone(true);
    }
    async function getRenderedContent() {
      for await (const page of LLMx.renderStream(memoized)) {
        setRenderedContent(page);
      }
    }
    getAllFrames();
    getRenderedContent();
  }, [componentToInspect]);

  useInput((_input, key) => {
    if (key.rightArrow) {
      setDebugTreeFrameIndex((prevIndex) => Math.min(debugTreeSteps.length - 1, prevIndex + 1));
    }
    if (key.leftArrow) {
      setDebugTreeFrameIndex((prevIndex) => Math.max(0, prevIndex - 1));
    }
  });

  return (
    <LLMx.Fragment
      // @ts-expect-error
      react
    >
      <Box
        flexDirection="row"
        // @ts-expect-error
        react
      >
        <Box
          flexDirection="column"
          // @ts-expect-error
          react
        >
          <Text
            // @ts-expect-error
            react
            bold
            underline
          >
            Live-streaming output
            {!debugTreeStreamIsDone && (
              <Spinner
                // @ts-expect-error
                react
              />
            )}
          </Text>
          <Text
            // @ts-expect-error
            react
          >
            {renderedContent}
          </Text>
        </Box>
        <Box
          flexDirection="column"
          // @ts-expect-error
          react
          paddingRight={2}
        >
          <Text
            // @ts-expect-error
            react
            bold
            underline
          >
            Tree Inspector
          </Text>
          <Text
            // @ts-expect-error
            react
            color="grey"
          >
            Viewing frame {debugTreeFrameIndex}/{Math.max(0, debugTreeSteps.length - 1)}
            {debugTreeStreamIsDone ? '' : '+'}
          </Text>
          <Text
            // @ts-expect-error
            react
            color="green"
          >
            {/* This doesn't handle JSX well, but it's better than nothing. */}
            <SyntaxHighlight
              // @ts-expect-error
              react
              code={debugTreeSteps[debugTreeFrameIndex] ?? ''}
              language="javascript"
            ></SyntaxHighlight>
          </Text>
        </Box>
      </Box>
    </LLMx.Fragment>
  );
}

export function showInspector(componentToInspect: LLMx.Node) {
  render(
    <Inspector
      // @ts-expect-error
      react
      componentToInspect={componentToInspect}
    />
  );
}

/**
 * Notes
 *
 * I think it'll be hard to make a polished UI with this. For instance:
 *
 *    - This doesn't handle large inputs well; I don't think it's possible to have a fixed area and a scrolling area.
 *    - If the size overflows the terminal, the whole layout breaks.
 *    - Flexbox sometimes has its children overflow.
 *    - Box borders sometimes are pushed in when they're next to text.
 *    - terminal-link isn't actually supported in many terminals.
 *    - It sometimes breaks in Warp. 🤪
 */

/**
 * If an error gets thrown, it breaks the UI.
 */
