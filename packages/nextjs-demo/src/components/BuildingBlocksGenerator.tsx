'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import * as BuildingBlocks from './BuildingBlocks';
import { MDXProvider } from '@mdx-js/react';
import { run, compile } from '@mdx-js/mdx';
import * as runtime from 'react/jsx-runtime';
import { useChat } from 'ai/react';
import _ from 'lodash';

export default function BuildingBlockGenerator({ topic }: { topic: string }) {
  const { messages, isLoading, append } = useChat({
    api: '/building-blocks/api',
  });

  useEffect(() => {
    if (messages.length === 0) {
      append({
        id: '0',
        role: 'user',
        content: topic,
      });
    }
  }, [messages]);

  const [mdx, setMdx] = useState<any>(null);

  function getAIResponse() {
    if (messages.length <= 1) {
      return null;
    }
    return messages[messages.length - 1].content;
  }

  useEffect(() => {
    (async () => {
      const aiResponse = getAIResponse();
      if (!aiResponse) {
        return;
      }
      let compiled;
      try {
        compiled = String(
          await compile(aiResponse, {
            outputFormat: 'function-body',
            // If we enable this, we get slightly nicer error messages.
            // But we also get _jsxDev is not a function.
            // This seems surmountable but also not something I want to attend to now.
            development: false,
          })
        );
      } catch {
        // Sometimes the current output will not be parsable – that's fine.
        return;
      }
      const { default: Content } = await run(compiled, runtime);
      setMdx(
        <MDXProvider components={BuildingBlocks}>
          <Content components={BuildingBlocks} />
        </MDXProvider>
      );
    })();
  }, [getAIResponse()]);

  return (
    <div>
      <h2 className='text-lg'>Raw MDX</h2>
      <div className="whitespace-pre-line">{getAIResponse()}</div>
      <div className="mt-4">
        {isLoading && <Image src="/loading.gif" alt="loading spiner" width={20} height={20} />}
      </div>
      <h2 className='text-lg mt-4'>Compiled MDX</h2>
      <div>{mdx}</div>
      <div className="mt-4">
        {isLoading && <Image src="/loading.gif" alt="loading spiner" width={20} height={20} />}
      </div>
    </div>
  );
}
