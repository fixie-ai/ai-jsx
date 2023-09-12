/**
 * This module provides the {@link UseTools} component to allow a Large Language Model to
 * invoke external functions.
 * @packageDocumentation
 */

import { ChatCompletion, FunctionParameters, FunctionResponse, FunctionResponseProps } from '../core/completion.js';
import { Component, ComponentContext, Node, RenderContext } from '../index.js';
import { Converse, renderToConversation } from '../core/conversation.js';

/**
 * Represents a tool that can be provided for the Large Language Model.
 */
export interface Tool {
  /**
   * A description of what the tool does.
   */
  description: string;

  /**
   * A map of parameter names to their description and type.
   */
  parameters: FunctionParameters;

  /**
   * A function that invokes the tool.
   *
   * @remarks
   * The function will be treated as an AI.JSX component: the tool parameters
   * will be passed as fields on the first argument (props) and the function
   * can return a `string` or any AI.JSX {@link Node}, synchronously or
   * asynchronously.
   */
  // Can we use Zod to do better than any?
  func: Component<any>;
}

/**
 * Properties to be passed to the {@link UseTools} component.
 */
export interface UseToolsProps {
  /**
   * The tools the AI can use.
   */
  tools: Record<string, Tool>;

  /**
   * The conversation in which the AI can use a tool.
   */
  children: Node;

  /**
   * Whether the result should include intermediate steps, for example, the execution of the function and its response.
   */
  showSteps?: boolean;

  /**
   * User data the AI can use to determine what parameters to invoke the tool with.
   *
   * For instance, if the user's query can be "what's the weather like at my current location", you might pass `userData` as { "location": "Seattle" }.
   */
  userData?: string;
}

/**
 * Executes a function during rendering and wraps the result in a `<FunctionResponse>`.
 */
export async function ExecuteFunction<T>(
  {
    name,
    func,
    args,
    ResponseWrapper = FunctionResponse,
  }: { name: string; func: Component<T>; args: T; ResponseWrapper?: Component<FunctionResponseProps> },
  { render }: ComponentContext
) {
  if (typeof func !== 'function') {
    return (
      <ResponseWrapper failed name={name}>
        Error: unknown function {name}
      </ResponseWrapper>
    );
  }

  try {
    const Func = func;
    return <ResponseWrapper name={name}>{await render(<Func {...args} />)}</ResponseWrapper>;
  } catch (e) {
    return <ResponseWrapper failed name={name}>{`${e}`}</ResponseWrapper>;
  }
}

/**
 * Give a model tools it can use, like a calculator, or ability to call an API.
 *
 * This is conceptually similar to [chatGPT plugins](https://openai.com/blog/chatgpt-plugins).
 *
 * @example
 * ```tsx
 *  async function turnLightsOn() { ... Code to turn lights on ... }
 *  async function turnLightsOff() { ... Code to turn lights off ... }
 *  // Activate a scene in the user's lighting settings, like "Bedtime" or "Midday".
 *  async function activeScene({sceneName}: {sceneName: string}) { ... Code to activate a scene ... }
 *
 *  import z from 'zod';
 *  const tools: Record<string, Tool> = {
 *    turnLightsOn: {
 *      description: "Turn the lights on in the user's home",
 *      parameters: {},
 *      func: turnLightsOn,
 *    },
 *    turnLightsOff: {
 *      description: "Turn the lights off in the user's home",
 *      parameters: {},
 *      func: turnLightsOff,
 *    },
 *    activeScene: {
 *      description: `Activate a scene in the user's lighting settings, like "Bedtime" or "Midday".`,
 *      parameters: {
 *        sceneName: {
 *          description: "The scene to activate the lighting in.",
 *          type: "string",
 *          required: true,
 *        },
 *      },
 *      func: activeScene,
 *    },
 *  };
 *
 * <UseTools tools={tools}>
 *   <SystemMessage>
 *     You control a home automation system. The user will request an action in their home. You should take an action and
 *     then generate a response telling the user what you've done.
 *   </SystemMessage>
 *   <UserMessage>{userRequest}</UserMessage>
 * </UseTools>;
 * ```
 *
 */
export async function UseTools(props: UseToolsProps, { render }: RenderContext) {
  const converse = (
    <Converse
      reply={(messages, fullConversation) => {
        const lastMessage = messages[messages.length - 1];
        switch (lastMessage.type) {
          case 'functionCall': {
            const { name, args } = lastMessage.element.props;
            return <ExecuteFunction func={props.tools[name].func} name={name} args={args} />;
          }
          case 'functionResponse':
          case 'user':
            return (
              <ChatCompletion functionDefinitions={props.tools}>
                {fullConversation.map((m) => m.element)}
              </ChatCompletion>
            );
          default:
            return null;
        }
      }}
    >
      {props.children}
    </Converse>
  );

  if (props.showSteps) {
    return converse;
  }

  const messages = await renderToConversation(converse, render);
  return messages.length && messages[messages.length - 1].element;
}
