/** @jsxImportSource ai-jsx/react */
import * as AI from '../index.js';
import { Node } from '../index.js';
import { useState, useEffect } from 'react';
import reactUse from 'react-use';
import SyntaxHighlight from './syntax-highlight.js';
import { memo } from '../core/memoize.js';
import Spinner from './spinner.js';
import { DebugTree } from '../core/debug.js';

import { Box, render, Text, useInput } from 'ink';

const { useList } = reactUse;

function Inspector({ componentToInspect, showDebugTree }: { componentToInspect: Node; showDebugTree: boolean }) {
  const [debugTreeSteps, { push: pushDebugTreeStep }] = useList([] as string[]);
  const [debugTreeFrameIndex, setDebugTreeFrameIndex] = useState<number | null>(null);
  const [debugTreeStreamIsDone, setDebugTreeStreamIsDone] = useState(false);

  const [renderedContent, setRenderedContent] = useState('');

  useEffect(() => {
    const renderContext = AI.createRenderContext();
    const memoized = memo(componentToInspect);

    async function getAllFrames() {
      // This results in some duplicate pages.
      const finalResult = await renderContext.render(<DebugTree>{memoized}</DebugTree>, {
        map: pushDebugTreeStep,
      });
      pushDebugTreeStep(finalResult);
      setDebugTreeStreamIsDone(true);
    }
    async function getRenderedContent() {
      const finalResult = await renderContext.render(memoized, { map: setRenderedContent });
      setRenderedContent(finalResult);
    }
    getAllFrames();
    getRenderedContent();
  }, [componentToInspect]);

  useInput((_input: any, key: any) => {
    if (key.rightArrow) {
      setDebugTreeFrameIndex((prevIndex) =>
        prevIndex === null ? debugTreeSteps.length - 1 : Math.min(debugTreeSteps.length - 1, prevIndex + 1)
      );
    }
    if (key.leftArrow) {
      setDebugTreeFrameIndex((prevIndex) =>
        prevIndex === null ? debugTreeSteps.length - 2 : Math.max(0, prevIndex - 1)
      );
    }
  });

  const debugFrameIndexToUse = debugTreeFrameIndex === null ? debugTreeSteps.length - 1 : debugTreeFrameIndex;

  return (
    <>
      <Box flexDirection="row">
        <Box flexDirection="column" width={showDebugTree ? '50%' : '100%'}>
          <Text bold underline>
            Live-streaming output
            {!debugTreeStreamIsDone && <Spinner />}
          </Text>
          <Text>{renderedContent}</Text>
        </Box>
        {showDebugTree && (
          <Box flexDirection="column" paddingLeft={2} width="50%">
            <Text bold underline>
              Tree Inspector
            </Text>
            <Text color="grey">
              Viewing frame {debugFrameIndexToUse}/{Math.max(0, debugTreeSteps.length - 1)}
              {debugTreeStreamIsDone ? '' : '+'}
            </Text>
            <Text color="green">
              {/* This doesn't handle JSX well, but it's better than nothing. */}
              <SyntaxHighlight
                code={debugTreeSteps[debugFrameIndexToUse] ?? ''}
                language="javascript"
              ></SyntaxHighlight>
            </Text>
          </Box>
        )}
      </Box>
    </>
  );
}

/**
 * `showInspector` renders an interactive, ASCII-based debug tool in the terminal window.
 *
 * The left side shows the streamed final output, and the right side shows the debug tree.
 * You can use the left and right arrow keys to step through the debug tree, to see
 * how your program was evaluated step by step.
 *
 * Note that if you call `showInspector` and also write to stdout or stderr (for instance, with `console.log`), the output may be messed up.
 *
 * @see DebugTree
 *
 * @example
 * ```tsx
 * function MyApp() {
 *   return (
 *    <ChatCompletion>
 *     <UserMessage>Generate a poem about red pandas.</UserMessage>
 *    </ChatCompletion>
 *   );
 * }
 * showInspector(<MyApp />);
 * ```
 */
export function showInspector(componentToInspect: Node, opts: { showDebugTree?: boolean } = {}) {
  const defaultOpts = { showDebugTree: true };
  const finalOpts = { ...defaultOpts, ...opts };
  render(<Inspector componentToInspect={componentToInspect} {...finalOpts} />);
}
