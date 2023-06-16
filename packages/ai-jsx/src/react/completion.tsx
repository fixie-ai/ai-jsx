/** @jsx AI.createElement */
import * as AI from './index.js';
import React from 'react';
import { ChatCompletion, SystemMessage, UserMessage } from '../core/completion.js';

function reactComponentName(component: React.JSXElementConstructor<any> | string) {
  return typeof component === 'string' ? component : component.name;
}

export async function UICompletion(
  { example, children }: { example: React.ReactNode; children: AI.Node },
  { render, logger }: AI.ComponentContext
) {
  const reactComponents = new Set<React.JSXElementConstructor<any> | string>();
  function collectComponents(node: React.ReactNode | AI.Node, inReact: boolean) {
    if (Array.isArray(node)) {
      node.forEach((node) => collectComponents(node, inReact));
    }

    if (React.isValidElement(node)) {
      if (inReact) {
        reactComponents.add(node.type);
      }

      const childrenAreReact = (inReact || node.type === AI.React) && node.type !== AI.jsx;
      if ('children' in node.props) {
        collectComponents(node.props.children, childrenAreReact);
      }
    }

    if (AI.isElement(node)) {
      const childrenAreReact = (inReact || node.tag === AI.React) && node.tag !== AI.jsx;
      if ('children' in node.props) {
        collectComponents(node.props.children, childrenAreReact);
      }
    }
  }

  collectComponents(example, true);

  const modelResult = await render(
    <ChatCompletion>
      <SystemMessage>
        You are an AI who is an expert UI designer. The user will provide content in the form of text and you will
        respond using a set of React components to create a UI for the content. Here are the only available React
        components and how they should be used:
        {'\n'}
        <AI.React>{example}</AI.React>
        {'\n'}
        Respond with a JSON object that encodes your UI. The JSON object should match this TypeScript interface:
        interface Element {'{'}
        name: string; children: (string | Element)[]
        {'}'}
        For example:{'\n'}
        {'<'}SomeComponent /{'>'}
        Becomes: {'{'} "name": "SomeComponent", "children": []{'}'}. Respond with only the JSON. Do not include any
        explanatory prose. Do not use any elements (including HTML elements) other than the ones above.
      </SystemMessage>
      <UserMessage>{children}</UserMessage>
    </ChatCompletion>
  );

  const validComponents = Object.fromEntries(Array.from(reactComponents).map((c) => [reactComponentName(c), c]));

  interface SerializedComponent {
    name: string;
    children: (string | SerializedComponent)[];
  }

  function toComponent(serializedComponent: SerializedComponent | string) {
    if (!serializedComponent || typeof serializedComponent === 'string') {
      return serializedComponent;
    }

    const Component = validComponents[serializedComponent.name];
    if (!Component) {
      logger.warn(
        { serializedComponent },
        `Ignoring component "${serializedComponent.name}" that wasn't present in the example. ` +
          'You may need to adjust the prompt or include an example of this component.'
      );
      return null;
    }

    if (!('children' in serializedComponent)) {
      throw new Error(
        `JSON produced by the model did not fit the required schema: ${JSON.stringify(serializedComponent)}`
      );
    }

    // Sometimes the model returns a singleton string instead of an array.
    const children =
      typeof serializedComponent.children === 'string' ? [serializedComponent.children] : serializedComponent.children;

    return (
      <AI.React>
        <Component>{children.map(toComponent)}</Component>
      </AI.React>
    );
  }

  return toComponent(JSON.parse(modelResult));
}
