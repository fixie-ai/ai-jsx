/** @jsxImportSource ai-jsx/react */
import * as AI from './index.js';
import React from 'react';
import { SystemMessage, UserMessage } from '../core/completion.js';
import { JsonChatCompletion } from '../batteries/constrained-output.js';
import { isJsxBoundary } from './jsx-boundary.js';
import { AIJSXError, ErrorCode } from '../core/errors.js';
import z from 'zod';

function reactComponentName(component: AI.Component<any> | React.JSXElementConstructor<any> | string) {
  return typeof component === 'string' ? component : component.name;
}

export async function* UICompletion(
  {
    example,
    aiComponents,
    children,
  }: { example: React.ReactNode; aiComponents: AI.Component<any>[]; children: AI.Node },
  { render, logger }: AI.ComponentContext
) {
  yield '';
  const reactComponents = new Set<AI.Component<any> | React.JSXElementConstructor<any> | string>();
  const validAIComponents = Object.fromEntries(aiComponents.map((c) => [reactComponentName(c), c]));
  for (const component of aiComponents) {
    reactComponents.add(component);
  }
  function collectComponents(node: React.ReactNode | AI.Node, inReact: boolean) {
    if (Array.isArray(node)) {
      node.forEach((node) => collectComponents(node, inReact));
    }

    if (React.isValidElement(node)) {
      if (inReact) {
        reactComponents.add(node.type);
      }

      const childrenAreReact = (inReact || node.type === AI.React) && !isJsxBoundary(node.type);
      if ('children' in node.props) {
        collectComponents(node.props.children, childrenAreReact);
      }
    }

    if (AI.isElement(node)) {
      const childrenAreReact = (inReact || node.tag === AI.React) && !isJsxBoundary(node.tag);
      if ('children' in node.props) {
        collectComponents(node.props.children, childrenAreReact);
      }
    }
  }

  collectComponents(example, true);

  const validComponents = Object.fromEntries(Array.from(reactComponents).map((c) => [reactComponentName(c), c]));

  interface SerializedComponent {
    name: string;
    children: (string | SerializedComponent)[];
  }

  function toComponent(serializedComponent: SerializedComponent[] | SerializedComponent | string) {
    if (Array.isArray(serializedComponent)) {
      return <AI.Fragment>{serializedComponent.map(toComponent)}</AI.Fragment>;
    }
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
      throw new AIJSXError(
        `JSON produced by the model did not fit the required schema: ${JSON.stringify(serializedComponent)}`,
        ErrorCode.ModelOutputDidNotMatchUIShape,
        'runtime'
      );
    }

    // Sometimes the model returns a singleton string instead of an array.
    const children =
      typeof serializedComponent.children === 'string' ? [serializedComponent.children] : serializedComponent.children;

    console.log('toComponent', serializedComponent.name, 'is AI?', serializedComponent.name in validAIComponents);

    if (serializedComponent.name in validAIComponents) {
      return (
        <AI.jsx>
          <Component>{children.map(toComponent)}</Component>
        </AI.jsx>
      );
    }
    return (
      <AI.React>
        <Component>{children.map(toComponent)}</Component>
      </AI.React>
    );
  }

  const Element: z.Schema = z.object({
    name: z.string().refine((c) => Boolean(validComponents[c]), {
      message: `Unknown component "name". Supported components: ${Object.keys(validComponents)}`,
    }),
    children: z.array(z.union([z.string(), z.lazy(() => Element)])),
  });

  const modelRenderGenerator = render(
    <JsonChatCompletion
      schema={Element}
      example={'<SomeComponent /> becomes: { "name": "SomeComponent", "children": [] }'}
    >
      <SystemMessage>
        You are an AI who is an expert UI designer. The user will provide content in the form of text and you will
        respond using a set of React components to create a UI for the content. Here are the only available React
        components with an example of how they should be used:
        {'\n'}
        ```tsx filename="example.tsx"{'\n'}
        <AI.React>{example}</AI.React>
        {'\n'}
        ```
        {'\n'}
        Do not use any elements (including HTML elements) other than the ones above.
        {'\n'}
        Note that {'ImageGen'} is a special component that will generate an image for you. Its children should describe
        the image you want to generate.
      </SystemMessage>
      <UserMessage>{children}</UserMessage>
    </JsonChatCompletion>
  )[Symbol.asyncIterator]();

  while (true) {
    const modelResult = await modelRenderGenerator.next();
    const component = toComponent(JSON.parse(modelResult.value));
    if (modelResult.done) {
      return component;
    }
    // TODO: fix & enable progressive loading
    // yield component;
  }
}
