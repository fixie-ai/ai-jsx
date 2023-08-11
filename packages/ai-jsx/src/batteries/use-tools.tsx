/**
 * This module provides the {@link UseTools} component to allow a Large Language Model to
 * invoke external functions.
 * @packageDocumentation
 */

import { ChatCompletion, FunctionParameters, FunctionResponse } from '../core/completion.js';
import { Node, RenderContext } from '../index.js';
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
   * A function to invoke the tool.
   */
  // Can we use Zod to do better than any[]?
  func: (
    ...args: any[]
  ) => string | number | boolean | null | undefined | Promise<string | number | boolean | null | undefined>;
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
 * <UseTools tools={tools} fallback="Politely explain you aren't able to help with that request.">
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
      reply={async (messages, fullConversation) => {
        const lastMessage = messages[messages.length - 1];
        switch (lastMessage.type) {
          case 'functionCall': {
            const { name, args } = lastMessage.element.props;
            try {
              return <FunctionResponse name={name}>{await props.tools[name].func(args)}</FunctionResponse>;
            } catch (e: any) {
              return (
                <FunctionResponse failed name={name}>
                  {e.message}
                </FunctionResponse>
              );
            }
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
