'use client';

import { useAIStream } from 'ai-jsx/react';
import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import * as BuildingBlocks from './BuildingBlocks';
import {MDXProvider, useMDXComponents} from '@mdx-js/react'
import {run, compile} from '@mdx-js/mdx'
import * as runtime from 'react/jsx-runtime'

function WrapMDX(props: any) {
  const components = useMDXComponents();
  return props.children;
}

export default function BuildingBlockGenerator({ topic }: { topic: string }) {
  const [isLoading, setIsLoading] = useState(false);
  const { current, fetchAI } = useAIStream({
    componentMap: BuildingBlocks,
    onComplete: (x) => {
      setIsLoading(false);
      return x;
    },
  });
  const [mdx, setMdx] = useState<any>(null)

  useEffect(() => {
    setIsLoading(true);
    fetchAI('/building-blocks/api', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ topic }),
    });
  }, [topic]);

  useEffect(() => {
    (async () => {
      if (!current) {
        return;
      }
      let compiled;
      try {
        compiled = String(await compile(current[0] as string, {
          outputFormat: 'function-body',
          // If we enable this, we get slightly nicer error messages.
          // But we also get _jsxDev is not a function.
          // This seems surmountable but also not something I want to attend to now.
          development: false,
        }))
      } catch {
        // Sometimes the current output will not be parsable – that's fine.
        return;
      }
      const {default: Content} = await run(compiled, runtime)
      setMdx(
      <MDXProvider components={BuildingBlocks}>
        <WrapMDX>
          <Content components={BuildingBlocks} />
        </WrapMDX>
      </MDXProvider>)
    })()

  }, [current])


  return (
    <div>
      <div className="whitespace-pre-line">{current}</div>
      <div>{mdx}</div>
      <div className="mt-4">
        {isLoading && <Image src="/loading.gif" alt="loading spiner" width={20} height={20} />}
      </div>
    </div>
  );
}
