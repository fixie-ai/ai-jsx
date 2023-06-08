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
  createElement(...args) {
    const tag = args[0];
    return knownLLMxTags.includes(tag.name) ? LLMx.createElement(...args) : React.createElement(...args);
  },
};

export default monkeyPatchedReact;
