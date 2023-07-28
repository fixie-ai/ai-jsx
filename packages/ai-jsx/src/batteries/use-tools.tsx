/**
 * This module provides the {@link UseTools} component to allow a Large Language Model to
 * invoke external functions.
 * @packageDocumentation
 */

import {
  AssistantMessage,
  ChatCompletion,
  FunctionCall,
  FunctionParameters,
  FunctionResponse,
  SystemMessage,
  UserMessage,
} from '../core/completion.js';
import {
  Node,
  RenderContext,
  isElement,
  Element,
  AppendOnlyStream,
  ComponentContext,
  RenderableStream,
} from '../index.js';
import z from 'zod';
import { zodToJsonSchema } from 'zod-to-json-schema';
import { AIJSXError, ErrorCode } from '../core/errors.js';

const toolChoiceSchema = z.object({
  nameOfTool: z.string(),
  parameters: z.record(z.string(), z.any()),
  responseToUser: z.string(),
});
export type ToolChoice = z.infer<typeof toolChoiceSchema> | null;

function ChooseTools(props: Pick<UseToolsProps, 'tools' | 'userData' | 'children'>): Node {
  return (
    <ChatCompletion>
      <SystemMessage>
        You are an expert agent who knows how to use tools. You can use the following tools:
        {Object.entries(props.tools).map(([toolName, tool]) => (
          <>
            {toolName}: Description: {tool.description}. Schema: {JSON.stringify(tool.parameters)}.
          </>
        ))}
        The user will ask you a question. Pick the tool that best addresses what they're looking for. Which tool do you
        want to use? Name the tool, identify the parameters, and generate a response to the user explaining what you're
        doing. Do not answer the user's question itself. Your answer should be a JSON object matching this schema:{' '}
        {JSON.stringify(zodToJsonSchema(toolChoiceSchema))}. Make sure to follow the schema strictly and do not include
        any explanatory prose prefix or suffix.{' '}
        {props.userData && <>When picking parameters, choose values according to this user data: {props.userData}</>}
        If none of the tools seem appropriate, or the user data doesn't have the necessary context to use the tool the
        user needs, respond with `null`.
      </SystemMessage>
      <UserMessage>Generate a JSON response for this query: {props.children}</UserMessage>
    </ChatCompletion>
  );
}

async function InvokeTool(
  props: { tools: Record<string, Tool>; toolChoice: Node; fallback: Node },
  { render }: RenderContext
) {
  // TODO: better validation around when this produces unexpected output.
  const toolChoiceLLMOutput = await render(props.toolChoice);
  let toolChoiceResult: ToolChoice;
  try {
    const parsedJson = JSON.parse(toolChoiceLLMOutput);
    if (parsedJson === null) {
      return props.fallback;
    }
    toolChoiceResult = toolChoiceSchema.parse(parsedJson);
  } catch (e: any) {
    const error = new AIJSXError(
      `Failed to parse LLM output into a tool choice: ${e.message}. Output: ${toolChoiceLLMOutput}`,
      ErrorCode.ModelOutputCouldNotBeParsedForTool,
      'runtime',
      { toolChoiceLLMOutput }
    );
    throw error;
  }
  if (!(toolChoiceResult.nameOfTool in props.tools)) {
    throw new AIJSXError(
      `LLM hallucinated a tool that does not exist: ${toolChoiceResult.nameOfTool}.`,
      ErrorCode.ModelHallucinatedTool,
      'runtime',
      { toolChoiceResult }
    );
  }
  const tool = props.tools[toolChoiceResult.nameOfTool];
  const toolResult = await tool.func(toolChoiceResult.parameters);

  // TDOO: Restore this once we have the logger attached to the render context.
  // log.info({ toolChoice: toolChoiceResult }, 'Invoking tool');

  return (
    <ChatCompletion>
      <SystemMessage>
        You are a tool-using agent. You previously chose to use a tool, and generated this response to the user:
        {toolChoiceResult.responseToUser}
        When you ran the tool, you got this result: {JSON.stringify(toolResult)}
        Using the above, provide a final response to the user.
      </SystemMessage>
    </ChatCompletion>
  );
}

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
  func: (...args: any[]) => string | number | boolean | null | undefined | Promise<string | number | boolean | null>;
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
   * A fallback response to use if the AI doesn't think any of the tools are relevant. This is only used for models that do not support functions natively. Models that support functions natively don't need this, because they generate
   * their own messages in the case of failure.
   */
  fallback: Node;

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
export async function* UseTools(props: UseToolsProps, { render }: RenderContext) {
  try {
    const rendered = yield* render(<UseToolsFunctionCall {...props} />);
    return rendered;
  } catch (e: any) {
    if (e.code === ErrorCode.ChatModelDoesNotSupportFunctions) {
      return <UseToolsPromptEngineered {...props} />;
    }
    throw e;
  }
}

/** @hidden */
export async function* UseToolsFunctionCall(
  props: UseToolsProps,
  { render, memo, logger }: ComponentContext
): RenderableStream {
  yield AppendOnlyStream;

  const conversation = [memo(props.children)];

  do {
    const modelResponse = memo(<ChatCompletion functionDefinitions={props.tools}>{conversation}</ChatCompletion>);
    if (props.showSteps) {
      yield modelResponse;
    }

    const renderResult = await render(modelResponse, {
      stop: (el) => el.tag === AssistantMessage || el.tag == FunctionCall,
    });
    let functionCallElement: Element<any> | null = null;

    for (const element of renderResult) {
      if (isElement(element)) {
        conversation.push(memo(element));

        if (element.tag === FunctionCall) {
          // Model has generated a function call.
          if (functionCallElement) {
            throw new AIJSXError(
              `ChatCompletion returned 2 function calls at the same time ${renderResult.join(', ')}`,
              ErrorCode.ModelOutputCouldNotBeParsedForTool,
              'runtime'
            );
          }
          functionCallElement = element;
        }
      } else {
        logger.debug(
          { text: element },
          '<ChatCompletion> emitted something other than <AssistantMessage> or <FunctionCall>, which is unexpected.'
        );
      }
    }

    if (functionCallElement) {
      // Call the selected function and append the result to the messages.
      let response;
      try {
        const callable = props.tools[functionCallElement.props.name].func;
        response = await callable(functionCallElement.props.args);
      } catch (e: any) {
        response = `Function call to ${functionCallElement.props.name} failed with error: ${e.message}.`;
      } finally {
        const functionResponse = memo(
          <FunctionResponse name={functionCallElement.props.name}>{response}</FunctionResponse>
        );
        if (props.showSteps) {
          yield (
            <>
              {'\n'}
              {functionResponse}
              {'\n'}
            </>
          );
        }
        conversation.push(functionResponse);
      }

      continue;
    }

    // Terminate the loop when the model produces a response without a function call.
    if (!props.showSteps) {
      yield modelResponse;
    }
    break;
  } while (true);

  return AppendOnlyStream;
}

/** @hidden */
export function UseToolsPromptEngineered(props: UseToolsProps) {
  return <InvokeTool tools={props.tools} toolChoice={<ChooseTools {...props} />} fallback={props.fallback} />;
}
