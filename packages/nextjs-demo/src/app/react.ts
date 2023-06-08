import React from 'react';
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
];

const monkeyPatchedReact = {
  ...React,
  createElement(...args: Parameters<typeof React.createElement>) {
    const tag = args[0];
    return typeof tag !== 'string' && knownLLMxTags.includes(tag.name) ? LLMx.createElement(...args) : React.createElement(...args);
  },
};

export default monkeyPatchedReact;
