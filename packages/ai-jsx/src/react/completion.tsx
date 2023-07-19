/** @jsxImportSource ai-jsx/react */
import * as AI from './index.js';
import React from 'react';
import { SystemMessage, UserMessage } from '../core/completion.js';
import { JsonChatCompletion } from '../batteries/constrained-output.js';
import { isJsxBoundary } from './jsx-boundary.js';
import { memo } from '../core/memoize.js';
import { AIJSXError, ErrorCode } from '../core/errors.js';
import z from 'zod';
import * as CryptoJS from 'crypto-js';

function reactComponentName(component: AI.Component<any> | React.JSXElementConstructor<any> | string) {
  return typeof component === 'string'
    ? component
    : typeof component === 'symbol'
    ? // @ts-expect-error
      component.description
    : component.name;
}

interface SerializedComponent {
  tag: string;
  children: string | (string | SerializedComponent)[];
  possiblyIncomplete?: boolean;
}

type ComponentType = AI.Component<any> | React.JSXElementConstructor<any> | string;

export async function* UICompletion(
  {
    reactComponentsDoc,
    aiComponentsDoc,
    children,
  }: {
    reactComponentsDoc?: React.ReactNode;
    aiComponentsDoc?: React.ReactNode;
    children: AI.Node;
  },
  { render, logger }: AI.ComponentContext
) {
  yield '';

  // TODO: what does the inReact flag do?
  const aiComponents = collectComponents(aiComponentsDoc, true);
  const validAIComponentsMap = Object.fromEntries(Array.from(aiComponents).map((c) => [reactComponentName(c), c]));

  const reactComponents = collectComponents(reactComponentsDoc, true);

  const allComponents = [...Array.from(reactComponents), ...Array.from(aiComponents)];
  const validComponentsMap = Object.fromEntries(allComponents.map((c) => [reactComponentName(c), c]));

  const memoizedComponents = new Map<string, AI.Node>();

  function getOrCreateMemo(serializedComponent: SerializedComponent, nonMemoized: AI.Node): AI.Node {
    const hash = CryptoJS.SHA256(JSON.stringify(serializedComponent)).toString();
    if (!memoizedComponents.has(hash)) {
      memoizedComponents.set(hash, memo(nonMemoized));
    }
    return memoizedComponents.get(hash);
  }

  // TODO: refactor this out of the component.
  function toComponent(serializedComponent: SerializedComponent[] | SerializedComponent | string) {
    if (!serializedComponent || typeof serializedComponent === 'string') {
      return serializedComponent;
    }
    if (Array.isArray(serializedComponent)) {
      return <AI.Fragment>{serializedComponent.map(toComponent)}</AI.Fragment>;
    }

    const Component = validComponentsMap[serializedComponent.tag];
    if (!Component) {
      logger.warn(
        { serializedComponent },
        `Ignoring component "${serializedComponent.tag}" that wasn't present in the example. ` +
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
    // (Is this still true even with the OpenAI function
    const children =
      typeof serializedComponent.children === 'string' ? [serializedComponent.children] : serializedComponent.children;

    if (serializedComponent.tag in validAIComponentsMap) {
      if (serializedComponent.possiblyIncomplete) {
        return `Loading ${serializedComponent.tag} ...`;
      }
      return (
        <AI.jsx>{getOrCreateMemo(serializedComponent, <Component>{children.map(toComponent)}</Component>)}</AI.jsx>
      );
    }
    return (
      <AI.React>
        <Component>{children.map(toComponent)}</Component>
      </AI.React>
    );
  }

  const Element: z.Schema = z.object({
    tag: z.string().refine((c) => Boolean(validComponentsMap[c]), {
      message: `Unknown component "tag". Supported components: ${Object.keys(validComponentsMap)}`,
    }),
    children: z.union([z.string(), z.array(z.union([z.string(), z.lazy(() => Element)]))]),
  });
  const Elements = z.union([Element, z.array(Element)]);
  const elementsWrapper = z.object({ root: Elements });

  const modelRenderGenerator = render(
    <JsonChatCompletion schema={elementsWrapper} retries={1}>
      <SystemMessage>
        You are an AI who is an expert UI designer. You can describe the UI as a nested JSON object. The JSON will be
        used to create a React/HTML UI tree. Each component is described using a "tag" name and a list of "children".
        Each child can be either a string or another component.
        {'For example <SomeComponent /> becomes { "tag": "SomeComponent", "children": [] }'}
        {'\n'}
        The user will ask you a question and your job is to use the set of React components below to create a UI that
        the query asks for.
        {'\n'}
        Here's a list of the components that are available to you and their documentation:
        {'\n```txt filename="component_docs.txt"\n'}
        <AI.React>{reactComponentsDoc}</AI.React>
        {'\n'}
        <AI.React>{aiComponentsDoc}</AI.React>
        {'\n```\n'}
        Do not use any elements (including HTML elements) other than the ones above. As such, the "tag" name of the
        component can only be one of the following: {Object.keys(validComponentsMap).join(', ')}. Nothing else is
        permitted.
      </SystemMessage>
      <UserMessage>{children}</UserMessage>
    </JsonChatCompletion>
  )[Symbol.asyncIterator]();

  while (true) {
    const modelResult = await modelRenderGenerator.next();
    logger.trace({ modelResult }, 'Got (possibly-intermediate) model result');
    yield modelResult.value;
    if (modelResult.done) {
      return modelResult.value;
    }
    // const object = JSON.parse(modelResult.value).root;
    // if (!modelResult.done) {
    //   markLastElementIncomplete(object);
    // }
    // const component = toComponent(object);
    // if (modelResult.done) {
    //   return component;
    // }
    // yield component;
  }
}

/**
 * Given a node, it will recursively traverse the tree and collect all the components that are used.
 * This is used to create a list of available components for the LLM to use.
 */
function collectComponents(
  node: React.ReactNode | AI.Node | undefined,
  inReact: boolean,
  componentsList: Set<ComponentType> = new Set<ComponentType>()
): Set<ComponentType> {
  if (!node) {
    return componentsList;
  }
  if (Array.isArray(node)) {
    node.forEach((node) => collectComponents(node, inReact, componentsList));
  }

  if (React.isValidElement(node)) {
    if (inReact) {
      componentsList.add(node.type);
    }

    const childrenAreReact = (inReact || node.type === AI.React) && !isJsxBoundary(node.type);
    if ('children' in node.props) {
      collectComponents(node.props.children, childrenAreReact, componentsList);
    }
  }

  if (AI.isElement(node)) {
    const childrenAreReact = (inReact || node.tag === AI.React) && !isJsxBoundary(node.tag);
    if ('children' in node.props) {
      collectComponents(node.props.children, childrenAreReact, componentsList);
    }
  }

  return componentsList;
}

/**
 * As the JSON is being built, the last element might be incomplete. This is fine for React components
 * but not for AI components. This function marks the last element as incomplete so as to not trigger
 * an API call with an incomplete value.
 *
 * This function has side-effects and mutates @serializedComponent
 */
function markLastElementIncomplete(
  serializedComponent: SerializedComponent[] | SerializedComponent | string | undefined | null
): void {
  if (serializedComponent === undefined || serializedComponent === null || typeof serializedComponent === 'string') {
    return;
  }
  if (Array.isArray(serializedComponent)) {
    markLastElementIncomplete(serializedComponent[serializedComponent.length - 1]);
    return;
  }

  Object.assign(serializedComponent, { possiblyIncomplete: true });

  markLastElementIncomplete(serializedComponent.children[serializedComponent.children.length - 1]);
}
