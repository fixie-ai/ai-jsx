import React, * as ReactModule from 'react';
import * as AI from './core.js';
import { asJsxBoundary } from './jsx-boundary.js';
import { AIJSXError, ErrorCode } from '../core/errors.js';
import { Deserialized, fromStreamResponse } from '../stream/index.js';
import { Jsonifiable } from 'type-fest';
import { ComponentMap } from './map.js';
import { Image } from '../core/image-gen.js';
import _ from 'lodash';
export * from './core.js';

/**
 * The {@link jsx} component will render its children until it gets to boundary elements.
 * This object defines how the boundary elements are handled.
 */
const boundaryElements = [
  { tag: AI.React, unwrap: (e: AI.Element<any>) => e.props.children },
  {
    tag: Image,
    unwrap: (e: AI.Element<any>) =>
      ReactModule.createElement('img', { src: e.props.url, alt: `Image generated from the prompt: ${e.props.prompt}` }),
  },
];

function unwrapReact(partiallyRendered: AI.PartiallyRendered): ReactModule.ReactNode {
  if (AI.isElement(partiallyRendered)) {
    for (const { tag, unwrap } of boundaryElements) {
      if (partiallyRendered.tag === tag) {
        return unwrap(partiallyRendered);
      }
    }
    const expectedElements = _.map(boundaryElements, 'tag').join(' or ');
    throw new AIJSXError(
      `unwrapReact only expects to see ${expectedElements} elements or strings.`,
      ErrorCode.UnexpectedRenderType,
      'internal'
    );
  }

  return partiallyRendered;
}

/**
 * Renders an AI.jsx component into React. Used by the <AI.jsx> element internally but
 * can be used directly an entrypoint into AI.jsx.
 */
export function useAI(children: AI.Node, onStreamStart?: () => void, onStreamEnd?: () => void) {
  const [result, setResult] = ReactModule.useState([] as ReactModule.ReactNode);
  const [isDone, setIsDone] = ReactModule.useState(false);

  ReactModule.useEffect(() => {
    let shouldStop = false;
    async function stream() {
      setResult([]);
      onStreamStart?.();
      setIsDone(false);

      // TODO: add a way for a render context to be aborted
      const renderResult = AI.createRenderContext().render(children, {
        stop: (e) => boundaryElements.some((special) => special.tag === e.tag),
        map: (frame) => frame.map(unwrapReact),
      });
      for await (const reactFrame of renderResult) {
        if (shouldStop) {
          return;
        }

        setResult(reactFrame);
      }

      const final = await renderResult;
      if (shouldStop) {
        return;
      }
      setResult(final.map(unwrapReact));
      onStreamEnd?.();
      setIsDone(true);
    }

    stream();

    return () => {
      onStreamEnd?.();
      shouldStop = true;
    };
  }, [children]);

  return { result, isDone };
}

/**
 * Options for the useAIStream React hook.
 */
export interface UseAIStreamOpts {
  /**
   * An event handler that runs when an AI stream has completed.
   * @param result The final rendering.
   * @returns The value to replace `current` with.
   */
  onComplete?: (result: ReactModule.ReactNode) => ReactModule.ReactNode;

  /**
   * An event handler that runs when the request fails.
   */
  onError?: (error: Error) => void;

  /**
   * A map between React components and serialized IDs. React components can be serialized
   * by the server and rehydrated on the client, but doing so requires using a shared
   * ComponentMap between the server and client.
   */
  componentMap?: ComponentMap<any>;
}

/**
 * The return value of the useAIStream React hook.
 */
export interface UseAIStreamResult {
  /**
   * The current state of the streamed UI. Will be null if there is no stream in progress.
   */
  current: ReactModule.ReactNode | null;

  /**
   * An error thrown by the last `fetchAI` invocation.
   */
  error: Error | null;

  /**
   * A wrapper around `fetch` to invoke an API that will return an AI.JSX stream.
   */
  fetchAI: (...fetchArguments: Parameters<typeof fetch>) => void;
}

function createDeserializer(componentMap?: ComponentMap) {
  return (parsed: Jsonifiable): Deserialized<ReactModule.ReactNode> => {
    if (typeof parsed !== 'object' || parsed === null) {
      return undefined;
    }

    if ('$$type' in parsed && parsed.$$type === 'element') {
      if (parsed.$$component === null) {
        return ReactModule.createElement(ReactModule.Fragment, parsed.props as any);
      }

      if (typeof parsed.$$component === 'string') {
        return ReactModule.createElement(parsed.$$component, parsed.props);
      }

      if (typeof parsed.$$component === 'object') {
        const id = (parsed.$$component as Record<string, any>).id;
        const component = componentMap?.idToComponent.get(id);
        if (component === undefined) {
          throw new AIJSXError(
            `Unknown UI component ${id}. Serialized React components must be referenced from a ComponentMap shared between the client and server.`,
            ErrorCode.UnknownUIComponentId,
            'user',
            {
              unknownComponentId: id,
              knownComponentIds: Array.from(componentMap?.idToComponent.keys() ?? []),
            }
          );
        }
        return ReactModule.createElement(component as any, parsed.props);
      }

      throw new AIJSXError('Unknown serialized component type', ErrorCode.UnknownSerializedComponentType, 'internal', {
        value: parsed,
      });
    }

    return undefined;
  };
}

/**
 * A React hook for presenting a UI stream from AI.JSX.
 */
export function useAIStream(options: UseAIStreamOpts = {}): UseAIStreamResult {
  const [currentStream, setCurrentStream] = ReactModule.useState<ReadableStream<ReactModule.ReactNode> | null>(null);
  const [currentUI, setCurrentUI] = ReactModule.useState(null as ReactModule.ReactNode);
  const [error, setError] = ReactModule.useState(null as Error | null);

  const onComplete = options.onComplete ?? ((x) => x);

  ReactModule.useEffect(() => {
    let shouldStopValue = false;
    const getShouldStop = () => shouldStopValue;

    async function readStream() {
      if (currentStream !== null) {
        const reader = currentStream.getReader();
        let lastUI: ReactModule.ReactNode = null;
        while (!getShouldStop()) {
          const { done, value } = await reader.read();
          if (done) {
            setCurrentStream(null);
            setCurrentUI(onComplete(lastUI));
            break;
          } else {
            setCurrentUI(value);
            lastUI = value;
          }
        }
        reader.releaseLock();
      }
    }

    readStream();

    return () => {
      shouldStopValue = true;
    };
  }, [currentStream]);

  return {
    current: currentUI,
    error,
    fetchAI(...fetchArguments: Parameters<typeof fetch>) {
      fetch(...fetchArguments)
        .then(async (response) => {
          if (!response.ok) {
            throw new AIJSXError(
              (await response.text()) || `fetch failed with status ${response.status}`,
              ErrorCode.AIJSXEndpointFailed,
              'runtime'
            );
          }
          if (!response.body) {
            throw new AIJSXError('The response body is empty.', ErrorCode.AIJSXEndpointHadEmptyResponse, 'runtime');
          }

          setCurrentStream(fromStreamResponse(response.body, createDeserializer(options.componentMap)));
          setError(null);
        })
        .catch((error) => {
          options.onError?.(error);
          setError(error);
        });
    },
  };
}

/**
 * A JSX component that allows AI.JSX elements to be used in a React component tree.
 */
export const jsx = asJsxBoundary(function jsx(
  {
    children,
    onStreamStart,
    onStreamEnd,
    loading = '',
  }: { children: AI.Node; onStreamStart?: () => void; onStreamEnd?: () => void; loading?: React.ReactNode },
  context?: any | AI.ComponentContext
) {
  if (typeof context?.render === 'function') {
    // We're in AI.JSX already.
    return children;
  }

  const ai = useAI(children, onStreamStart, onStreamEnd);
  const waitingForFirstAIResponse = !ai.isDone && Array.isArray(ai.result) && ai.result.length === 0;

  return ReactModule.createElement(ReactModule.Fragment, null, waitingForFirstAIResponse ? loading : ai.result) as any;
});
export const JSX = jsx;
