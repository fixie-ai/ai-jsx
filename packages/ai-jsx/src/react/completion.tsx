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
import _ from 'lodash';

function reactComponentName(component: AI.Component<any> | React.JSXElementConstructor<any> | string) {
  return typeof component === 'string'
    ? component
    : typeof component === 'symbol'
    ? // @ts-expect-error
      component.description
    : component.name;
}

// This needs to be partial to reflect the fact that we accept partially-streamed results,
// so any field could be missing. Also, should this type be the same as the Element zod schema?
type SerializedComponent = Partial<{
  tag: string;
  children: string | (string | SerializedComponent)[];
  possiblyIncomplete?: boolean;
  props: Record<string, any>;
}>;

export async function* UICompletion(
  {
    reactComponentsDoc,
    aiComponentsDoc,
    reactComponents,
    aiComponents,
    children,
  }: {
    reactComponentsDoc?: string;
    aiComponentsDoc?: string;
    // TODO: This is not the right type for `import * as Components from './my-components'`.
    // `Components` in that example will be a Module, which is not the same as a Record.
    // But I'm not sure what type TS offers for this.
    aiComponents: Record<string, AI.Component<any>>;
    reactComponents: Record<string, React.JSXElementConstructor<any>>;
    children: AI.Node;
  },
  { render, logger }: AI.ComponentContext
) {
  yield '';

  const validAIComponentsMap = aiComponents;

  const allComponents = [...Object.values(reactComponents), ...Object.values(aiComponents)];
  // To make `reactComponentName` more robust, we can use the keys of `reactComponents` and `aiComponents`. In fact, maybe that's all we should be using.
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
    // TODO: do we need a better abstraction for handling a partial output? I feel like
    // our handling logic is too spread out / error prone right now.
    if (_.isEmpty(serializedComponent) || !serializedComponent.tag) {
      return;
    }

    if (!serializedComponent.possiblyIncomplete && !('children' in serializedComponent)) {
      throw new AIJSXError(
        `JSON produced by the model did not fit the required schema: ${JSON.stringify(serializedComponent)}`,
        ErrorCode.ModelOutputDidNotMatchUIShape,
        'runtime'
      );
    }

    // Sometimes the model returns a singleton string instead of an array.
    // (Is this still true even with the OpenAI function?)
    const children =
      typeof serializedComponent.children === 'string' ? [serializedComponent.children] : serializedComponent.children;

    const Component = validComponentsMap[serializedComponent.tag];
    if (!Component) {

      const tagIsPrefixOfAnyKey = Object.keys(validComponentsMap).some((k) => k.startsWith(serializedComponent.tag ?? ''));

      // The result could still be partially rendering.
      if (tagIsPrefixOfAnyKey) {
        return null;
      }

      logger.warn(
        { serializedComponent },
        `Ignoring component "${serializedComponent.tag}" that wasn't present in the example. ` +
          'You may need to adjust the prompt or include an example of this component.'
      );
      return <AI.Fragment>{children?.map(toComponent)}</AI.Fragment>;
    }

    const props = serializedComponent.props ?? {};

    if (serializedComponent.tag in validAIComponentsMap) {
      if (serializedComponent.possiblyIncomplete) {
        return `Loading ${serializedComponent.tag} ...`;
      }
      return (
        <AI.jsx>{getOrCreateMemo(serializedComponent, <Component {...props}>{children?.map(toComponent)}</Component>)}</AI.jsx>
      );
    }
    return (
      <AI.React>
        <Component {...props}>{children?.map(toComponent)}</Component>
      </AI.React>
    );
  }

  const Element: z.Schema = z.object({
    tag: z.string().refine((c) => Boolean(validComponentsMap[c]), {
      message: `Unknown component "tag". Supported components: ${Object.keys(validComponentsMap)}`,
    }),
    // The results will look better in the UI if the AI gives `props` back before `children`.
    props: z.record(z.any()),
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
    // yield modelResult.value;
    // if (modelResult.done) {
    //   return modelResult.value;
    // }
    const generatedUI = JSON.parse(modelResult.value).root;
    if (!modelResult.done) {
      markLastElementIncomplete(generatedUI);
    }
    let component;
    try {
      component = toComponent(generatedUI);
    } catch (e) {
      debugger;
      throw e;
    }
    // Also log if toComponent returns null
    if (modelResult.done) {
      return component;
    }
    yield component;
  }
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
  if (typeof serializedComponent === 'string' || _.isEmpty(serializedComponent)) {
    return;
  }
  if (Array.isArray(serializedComponent)) {
    markLastElementIncomplete(serializedComponent[serializedComponent.length - 1]);
    return;
  }

  Object.assign(serializedComponent, { possiblyIncomplete: true });

  if (serializedComponent.children) {
    markLastElementIncomplete(serializedComponent.children[serializedComponent.children.length - 1]);
  }
}
