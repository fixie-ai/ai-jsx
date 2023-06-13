import React from 'react';
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
    const llmxElement = LLMx.createElement(...(args as unknown as Parameters<typeof LLMx.createElement>));
    const isEmbeddableReactElement = typeof tag === 'string' || embeddableReactTags.includes(tag.name);
    const indirectNode = isEmbeddableReactElement
      ? LLMx.createElement(
          // @ts-expect-error
          AIDehydrate,
          { reactElement, ...args[1] },
          ...args.slice(2)
        )
      : llmxElement;
    LLMx.setIndirectNode(
      // @ts-expect-error
      reactElement,
      indirectNode
    );
    return reactElement;
  },
};

export default monkeyPatchedReact;
