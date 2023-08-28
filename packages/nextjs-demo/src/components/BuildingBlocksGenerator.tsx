'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import * as BuildingBlocks from './BuildingBlocks';
import * as runtime from 'react/jsx-runtime';
import { useChat } from 'ai/react';

// I don't feel like messing with the build system to fix this.
// We get the error:
// "The current file is a CommonJS module whose imports will produce 'require' calls; however, the referenced file is an ECMAScript module and cannot be imported with 'require'. Consider writing a dynamic 'import("@mdx-js/mdx")' call instead."
// @ts-expect-error
import { run, compile } from '@mdx-js/mdx';
// @ts-expect-error
import remarkGFM from 'remark-gfm';

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
            remarkPlugins: [remarkGFM],
          })
        );
      } catch {
        console.log(
          'Cannot parse MDX. If the stream is still coming in, this is fine. But if you were expecting this to be parsable, then there may be a bug.',
          aiResponse
        );
        return;
      }
      const { default: Content } = await run(compiled, runtime);

      const components = {
        table: (props: any) => <table className="min-w-full divide-y divide-gray-300" {...props} />,
        th: (props: any) => (
          <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900" {...props} />
        ),
        td: (props: any) => <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500" {...props} />,
        h2: (props: any) => <h2 className="text-lg font-bold" {...props} />,
        h3: (props: any) => <h2 className="text-md font-bold" {...props} />,
        h4: (props: any) => <h2 className="text-sm uppercase font-bold" {...props} />,
        ...BuildingBlocks,
      };

      setMdx(<Content components={components} />);
    })();
  }, [getAIResponse()]);

  return (
    <div>
      <h2 className="text-lg">Raw MDX</h2>
      <div className="whitespace-pre-line">{getAIResponse()}</div>
      <div className="mt-4">
        {isLoading && <Image src="/loading.gif" alt="loading spiner" width={20} height={20} />}
      </div>
      <h2 className="text-lg mt-4">Compiled MDX</h2>
      <div>{mdx}</div>
      <div className="mt-4">
        {isLoading && <Image src="/loading.gif" alt="loading spiner" width={20} height={20} />}
      </div>
    </div>
  );
}
