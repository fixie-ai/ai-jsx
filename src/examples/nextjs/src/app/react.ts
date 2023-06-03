import React from 'react';
import {LLMx} from '../../../../../dist/lib/index.js';

const knownLLMxTags = [
  'ChatCompletion',
  'UserMessage',
  'DogNames',
]

const monkeyPatchedReact = {
  ...React,
  createElement(...args) {
    const tag = args[0];
    return knownLLMxTags.includes(tag.name) ? LLMx.createElement(...args) : React.createElement(...args);
  },
}

export default monkeyPatchedReact;