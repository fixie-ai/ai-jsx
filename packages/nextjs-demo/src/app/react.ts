import React from 'react';
// I don't know what to do about this error.
// @ts-expect-error
import * as LLMx from '@fixieai/ai-jsx';

// We would like to find a way to eliminate the need for this list.
// This is only needed in the case where you are nesting React components inside your LLMx components.
const embeddableReactTags = [
  'Recipe',
  'RecipeTitle',
  'RecipeInstructionList',
  'RecipeInstructionListItem',
  'RecipeIngredientList',
  'RecipeIngredientListItem',
];

function AIDehydrate({ reactElement }: { reactElement: any }) {
  return `<${reactElement.type.name}>${reactElement.props.children}</${reactElement.type.name}>`;
}

const monkeyPatchedReact = {
  ...React,
  createElement(...args: Parameters<typeof React.createElement>) {
    const tag = args[0];
    const reactElement = React.createElement(...args);
    const llmxElement = LLMx.createElement(...args);
    const isEmbeddableReactElement = typeof tag === 'string' || embeddableReactTags.includes(tag.name);
    const indirectNode = isEmbeddableReactElement
      ? LLMx.createElement(AIDehydrate, { reactElement, ...args[1] }, ...args.slice(2))
      : llmxElement;
    LLMx.setIndirectNode(reactElement, indirectNode);
    return reactElement;
  },
};

export default monkeyPatchedReact;
