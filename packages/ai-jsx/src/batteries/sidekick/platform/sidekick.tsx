import { present } from './conversation.js';
import { UseTools } from './use-tools-eject.js';
import { SidekickSystemMessage } from './system-message.js';
import _ from 'lodash';
import { OpenAI } from '../../../lib/openai.js';
import { UseToolsProps } from '../../use-tools.js';
import * as AI from '../../../index.js';
import { ConversationHistory, ShowConversation } from '../../../core/conversation.js';

export type OpenAIChatModel = Exclude<Parameters<typeof OpenAI>[0]['chatModel'], undefined>;
export type ModelProvider = 'openai';
export type ChatModel = OpenAIChatModel;

/**
 * This is not as type safe as it could be, but I'm fine with that because the type safety would have to be enforced
 * at the API layer (e.g. req.body()), and even after we did that, I'm not convinceed we could actually assert to TS
 * that we've validated the types.
 *
 * If the user passes a modelProvider that doesn't match the model, AI.JSX will throw an error at completion time.
 */
export function ModelProvider({
  children,
  modelProvider,
  model,
}: {
  children: AI.Node;
  modelProvider: ModelProvider;
  model: ChatModel;
}) {
  switch (modelProvider) {
    case 'openai':
      return (
        <OpenAI chatModel={model as OpenAIChatModel} temperature={0}>
          {children}
        </OpenAI>
      );
    default:
      throw new Error(`Unknown model provider: ${modelProvider}`);
  }
}

export interface SidekickProps {
  tools?: UseToolsProps['tools'];
  systemMessage?: AI.Node;
  finalSystemMessageBeforeResponse?: AI.Node;
  genUIExamples?: AI.Node;
  genUIComponentNames?: string[];

  /**
   * The role the model should take, like "a customer service agent for Help Scout".
   */
  role: string;
}

function makeObservedTools(tools: UseToolsProps['tools'], logger: AI.ComponentContext['logger']) {
  return _.mapValues(tools, (tool, toolName) => ({
    ...tool,
    func: async (...args: Parameters<typeof tool.func>) => {
      logger.info({ toolName, args }, 'Calling tool');
      try {
        const result = await Promise.resolve(tool.func(...args));
        logger.info({ toolName, args, result }, 'Got result from tool');
        return typeof result === 'string' ? result : JSON.stringify(result);
      } catch (e) {
        logger.error({ toolName, args, e }, 'Got error calling tool');
        throw e;
      }
    },
  }));
}

export function Sidekick(props: SidekickProps, { logger }: AI.ComponentContext) {
  const observedTools = makeObservedTools(props.tools ?? {}, logger);

  return (
        <ModelProvider model='gpt-4-32k' modelProvider='openai'>
          <UseTools
            tools={observedTools}
            showSteps
            finalSystemMessageBeforeResponse={props.finalSystemMessageBeforeResponse}
          >
            <SidekickSystemMessage
              timeZone='America/Los_Angeles'
              timeZoneOffset='420'
              role={props.role}
              userProvidedGenUIUsageExamples={props.genUIExamples}
              userProvidedGenUIComponentNames={props.genUIComponentNames}
            />
            {props.systemMessage}
            <ConversationHistory />
          </UseTools>
        </ModelProvider>
  );
}
