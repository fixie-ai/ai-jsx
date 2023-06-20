/** @jsxImportSource ai-jsx/react */
import * as AI from '../index.js';
import { Node } from '../index.js';
import { useState, useEffect } from 'react';
import reactUse from 'react-use';
import SyntaxHighlight from './syntax-highlight.js';
import { memo } from '../core/memoize.js';
import Spinner from './spinner.js';
import { DebugTree } from '../core/debug.js';

import { Box, render, Spacer, Text, useInput, useStdout } from 'ink';

const { useList } = reactUse;

/** Get the size of the terminal window. */
export function useStdoutDimensions(): [number, number] {
  const { stdout } = useStdout();
  const [dimensions, setDimensions] = useState<[number, number]>([stdout.columns, stdout.rows]);

  useEffect(() => {
    const handler = () => setDimensions([stdout.columns, stdout.rows]);
    stdout.on('resize', handler);
    return () => {
      stdout.off('resize', handler);
    };
  }, [stdout]);

  return dimensions;
}

function InspectorTitle({ frame, totalFrames, done }: { frame: number; totalFrames: number; done: boolean }) {
  return (
    <Box paddingLeft={1} width="100%">
      <Text>🦊 AI.JSX Inspector</Text>
      <Spacer />
      <Text color="grey">
        Frame {frame}/{totalFrames}
        {done ? '' : '+'}
      </Text>
    </Box>
  );
}

function LiveStream({ content, width, height }: { content: string; width: string; height: number | string }) {
  return (
    <Box borderStyle="round" borderColor="blue" flexDirection="column" width={width} height={height} overflow="hidden" >
      <Text>{content}</Text>
    </Box>
  );
}

function DebugTreeStream({ content, width, height }: { content: string; width: string; height: number | string }) {
  return (
    <Box borderStyle="round" borderColor="blue" flexDirection="column" paddingLeft={2} width={width} height={height} overflow="hidden" >
      <Text color="green">
        {/* This doesn't handle JSX well, but it's better than nothing. */}
        <SyntaxHighlight code={content} language="javascript"></SyntaxHighlight>
      </Text>
    </Box>
  );
}

function StatusBar() {
  return (
    <Box width="100%" height={1}>
      <Text>Left/right arrow keys to browse history, 1=first, 9=last, q to quit.</Text>
    </Box>
  );
}

function Inspector({ componentToInspect, showDebugTree }: { componentToInspect: Node; showDebugTree: boolean }) {
  const [debugTreeSteps, { push: pushDebugTreeStep }] = useList([] as string[]);
  const [debugTreeFrameIndex, setDebugTreeFrameIndex] = useState<number | null>(null);
  const [debugTreeStreamIsDone, setDebugTreeStreamIsDone] = useState(false);
  const [columns, rows] = useStdoutDimensions();

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

  useInput((input: any, key: any) => {
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
    if (input === "1") {
      setDebugTreeFrameIndex(0);
    }
    if (input === "9") {
      setDebugTreeFrameIndex(debugTreeSteps.length - 1);
    }
    if (input === 'q') {
      process.exit();
    }
  });

  const debugFrameIndexToUse = debugTreeFrameIndex === null ? debugTreeSteps.length - 1 : debugTreeFrameIndex;

  return (
    <>
      <Box flexDirection="column" height={rows}>
        <InspectorTitle
          frame={debugFrameIndexToUse}
          totalFrames={Math.max(0, debugTreeSteps.length - 1)}
          done={debugTreeStreamIsDone}
        />
        <Box flexDirection="row">
          <LiveStream content={renderedContent} width={showDebugTree ? '50%' : '100%'} height={rows - 6} />

          {showDebugTree && (
            <DebugTreeStream content={debugTreeSteps[debugFrameIndexToUse] ?? ''} width="50%" height={rows - 6} />
          )}
        </Box>
        <StatusBar />
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
