import React from 'react';
// I don't know what to do about this error.
// @ts-expect-error
import * as LLMx from '@fixieai/ai-jsx';

const knownLLMxTags = [
  'ChatCompletion',
  'UserMessage',
  'SystemMessage',
  'QueryGitHub',
  'FetchGitHubGraphQL',
  'NaturalLanguageGitHubSearch',
  'DogNames',
  'FormatAsHtml',
  'FormatAsProse',
  'ZeppHealth',
];

const monkeyPatchedReact = {
  ...React,
  createElement(...args: Parameters<typeof React.createElement>) {
    const tag = args[0];
    return typeof tag !== 'string' && knownLLMxTags.includes(tag.name)
      ? LLMx.createElement(
          // TS isn't smart enough to narrow the types and realize that `args[0]` is not a string.
          // @ts-expect-error
          ...args
        )
      : React.createElement(...args);
  },
};

export default monkeyPatchedReact;
