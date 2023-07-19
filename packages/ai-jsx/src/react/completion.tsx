/** @jsxImportSource ai-jsx/react */
import * as AI from './core.js';
import React from 'react';
import { SystemMessage, UserMessage } from '../core/completion.js';
import { JsonChatCompletion } from '../batteries/constrained-output.js';
import { isJsxBoundary } from './jsx-boundary.js';
import { AIJSXError, ErrorCode } from '../core/errors.js';
import z from 'zod';

function reactComponentName(component: React.JSXElementConstructor<any> | string) {
  return typeof component === 'string' ? component : component.name;
}

export async function* UICompletion(
  { example, children }: { example: React.ReactNode; children: AI.Node },
  { render, logger }: AI.ComponentContext
) {
  yield '';
  const reactComponents = new Set<React.JSXElementConstructor<any> | string>();
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
      throw new AIJSXError(
        `JSON produced by the model did not fit the required schema: ${JSON.stringify(serializedComponent)}`,
        ErrorCode.ModelOutputDidNotMatchUIShape,
        'runtime'
      );
    }

    // Sometimes the model returns a singleton string instead of an array.
    const children =
      typeof serializedComponent.children === 'string' ? [serializedComponent.children] : serializedComponent.children;

    return <Component>{children.map(toComponent)}</Component>;
  }

  const Element: z.ZodObject<any> = z.object({
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
        components and how they should be used:
        {'\n'}
        <AI.React>{example}</AI.React>
        {'\n'}
        Do not use any elements (including HTML elements) other than the ones above.
      </SystemMessage>
      <UserMessage>{children}</UserMessage>
    </JsonChatCompletion>
  )[Symbol.asyncIterator]();

  while (true) {
    const modelResult = await modelRenderGenerator.next();
    const component = <AI.React>{toComponent(JSON.parse(modelResult.value))}</AI.React>;
    if (modelResult.done) {
      return component;
    }
    yield component;
  }
}
