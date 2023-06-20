import React from 'react';

export default function About() {
  return (
    <div className="flex flex-col">
      <div className="h-6 flex-row w-full"></div>
      <div className="flex flex-row w-full">
        <div className="w-1/5"></div>
        <div className="w-3/5">
          <div className="p-6 bg-white shadow font-medium text-gray-500 text-lg">
            This is a demo of{' '}
            <a className="underline" href="https://ai-jsx.com/">
              AI.JSX
            </a>{' '}
            using React. AI.JSX is a JavaScript framework for building powerful applications with Large Language Models.
            For more details, checkout the{' '}
            <a className="underline" href="https://docs.ai-jsx.com/">
              AI.JSX documentation
            </a>
            , or the{' '}
            <a className="underline" href="https://github.com/fixie-ai/ai-jsx/tree/main/packages/create-react-app-demo">
              source code for this app
            </a>
            .
          </div>
        </div>
        <div className="w-1/5"></div>
      </div>
    </div>
  );
}
