import React from 'react';

export default function About() {
  return (
    <div className="flex flex-col items-start px-24 py-6">
      <div className="min-w-full max-w-7xl">
        <div className="min-w-full max-w-none">
          <div className="overflow-hidden bg-white sm:rounded-lg sm:shadow">
            <div className="whitespace-pre-wrap bg-white px-4 py-5 sm:px-6">
              <p>
                This is a demo of{' '}
                <a className="underline" href="https://ai-jsx.com/">
                  AI.JSX
                </a>{' '}
                using Next.js and React. AI.JSX is a JavaScript framework for building powerful applications with Large
                Language Models. For more details, checkout the{' '}
                <a className="underline" href="https://docs.ai-jsx.com/">
                  AI.JSX documentation
                </a>
                , or the{' '}
                <a
                  className="underline"
                  href="https://github.com/fixie-ai/ai-jsx/tree/main/packages/create-react-app-demo"
                >
                  source code for this app
                </a>
                .
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
