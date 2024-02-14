/**
 * This module provides the {@link UseTools} component to allow a Large Language Model to
 * invoke external functions.
 * @packageDocumentation
 */

import { ChatCompletion, FunctionDefinition, FunctionResponse } from '../core/completion.js';
import { Component, ComponentContext, Node, RenderContext } from '../index.js';
import { ConversationMessage, Converse, renderToConversation } from '../core/conversation.js';
import _ from 'lodash';

/**
 * Represents a tool that can be provided for the Large Language Model.
 */
export interface Tool extends FunctionDefinition {
  /**
   * A function that invokes the tool.
   *
   * @remarks
   * The function will be treated as an AI.JSX component: the tool parameters
   * will be passed as fields on the first argument (props) and the function
   * can return a `string` or any AI.JSX {@link Node}, synchronously or
   * asynchronously.
   */
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
}

/**
 * Executes a function during rendering and wraps the result in a `<FunctionResponse>`.
 */
export async function ExecuteFunction<T>(
  { id, name, func, args }: { id?: string; name: string; func: Component<T>; args: T },
  { render }: ComponentContext
) {
  if (typeof func !== 'function') {
    return (
      <FunctionResponse id={id} failed name={name}>
        Error: unknown function {name}
      </FunctionResponse>
    );
  }

  try {
    const Func = func;
    return (
      <FunctionResponse id={id} name={name}>
        {await render(<Func {...args} />).untilComplete()}
      </FunctionResponse>
    );
  } catch (e) {
    return <FunctionResponse id={id} failed name={name}>{`${e}`}</FunctionResponse>;
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
 *        type: "object",
 *        properties: {
 *          sceneName: {
 *            description: "The scene to activate the lighting in.",
 *            type: "string",
 *           },
 *        },
 *        required: ["sceneName"],
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
export function UseTools(props: UseToolsProps) {
  return (
    <Converse
      reply={(messages, fullConversation) => {
        const lastMessage = messages[messages.length - 1];
        switch (lastMessage.type) {
          case 'functionCall': {
            // Collect all the adjacent function calls and execute them.
            const functionCalls = _.takeRightWhile(
              messages,
              (m) => m.type === 'functionCall'
            ) as (ConversationMessage & { type: 'functionCall' })[];

            return (context) =>
              Promise.all(
                functionCalls.map(async (functionCall) => {
                  const name = await context.render(functionCall.attributes.name).toStringAsync();
                  return (
                    <ExecuteFunction
                      id={functionCall.attributes.id}
                      func={props.tools[name].func}
                      name={name}
                      args={JSON.parse(await functionCall.toStringAsync())}
                    />
                  );
                })
              );
          }
          case 'functionResponse':
          case 'user':
            return <ChatCompletion functionDefinitions={props.tools}>{fullConversation}</ChatCompletion>;
          default:
            return null;
        }
      }}
    >
      {props.children}
    </Converse>
  );
}
