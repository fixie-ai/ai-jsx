import { LLMx } from '../lib/index.ts';
import { ReactNode, useState, useEffect } from 'react';
import reactUse from 'react-use';
import { Box, render, Static, Text, useInput } from 'ink';
import { DebugTree } from '../lib/debug.tsx';
import SyntaxHighlight from './syntax-highlight.tsx';
import Link from './link.tsx';
import path from 'node:path';
import { memo } from '../lib/memoize.tsx';

const { useList } = reactUse;

const FullScreenLayout = (props: { children: ReactNode }) => {
  const [size, setSize] = useState({
    columns: process.stdout.columns,
    rows: process.stdout.rows,
  });

  useEffect(() => {
    const handleResize = () => {
      setSize({
        columns: process.stdout.columns,
        rows: process.stdout.rows,
      });
    };

    process.stdout.on('resize', handleResize);
    return () => {
      process.stdout.off('resize', handleResize);
    };
  }, []);

  return (
    <Box
      react
      flexDirection="column"
      width={size.columns}
      height={size.rows}
      borderStyle="double"
      paddingLeft={1}
      paddingRight={1}
    >
      {props.children}
    </Box>
  );
};

function TopBar() {
  const logsFile = path.resolve('llmx.log');
  return (
    <Box
      react
      width="100%"
      height={1}
      justifyContent="space-between"
      borderBottom
      borderColor="white"
      borderStyle="single"
      padding={1}
      borderTop={false}
      borderLeft={false}
      borderRight={false}
    >
      <Text react bold>
        AI.JSX Inspector
      </Text>
      <Text react bold>
        <Link url="https://github.com/fixie-ai/ai-jsx/blob/main/readme.md" react>
          Docs
        </Link>
      </Text>
      <Text react bold>
        <Link url={logsFile} react>
          Logs
        </Link>
      </Text>
    </Box>
  );
}

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

  // <FullScreenLayout react>
  // <TopBar react />
  // </FullScreenLayout>

  return (
    <LLMx.Fragment react>
      <Box flexDirection="row" react>
      <Box flexDirection="col" react>
          <Text react bold underline>
            Live-streaming output
          </Text>
          <Text react>{renderedContent}</Text>
        </Box>
        <Box flexDirection="col" react paddingRight={2}>
          <Text react bold underline>
            Tree Inspector
          </Text>
          <Text react color="grey">
            Viewing frame {debugTreeFrameIndex}/{Math.max(0, debugTreeSteps.length - 1)}{debugTreeStreamIsDone ? '' : '+'}
          </Text>
          <Text
            // @ts-expect-error
            react
            color="green"
          >
            {/* This doesn't handle JSX well, but it's better than nothing. */}
            <SyntaxHighlight
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
 */
