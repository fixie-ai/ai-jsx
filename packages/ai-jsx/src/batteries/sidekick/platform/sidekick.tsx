/** @jsxImportSource ai-jsx/react */
import { present } from './conversation';
import { UseTools } from './use-tools-eject';
import { SidekickSystemMessage } from './system-message';
import _ from 'lodash';
import { OpenAI } from '../../../lib/openai.js';
import { UseToolsProps } from '../../use-tools.js';
import * as AI from '../../../index.js';
import { ShowConversation } from '../../../core/conversation.js';

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

/**
 * Data provided by the Fixie platform to drive your Sidekick. In the simple
 * case, you can pass this through to the Sidekick directly. If you have
 * advanced needs, you can either modify these values, or disregard the
 * Fixie-provided values entirely and provide your own.
 */
export interface PlatformProvidedSidekickProps {
  /** Provided by the Fixie service, this array contains 
      the previous conversation the agent had with the user in this thread. */
  // TODO: find a better type for this
  conversationHistory: AI.Node[];

  /** In hours, the offset from UTC */
  timeZoneOffset: string;
  timeZone: string;

  model: ChatModel;
  modelProvider: ModelProvider;
}

export interface SidekickProps extends PlatformProvidedSidekickProps {
  tools?: UseToolsProps['tools'];
  systemMessage?: AI.Node;
  finalSystemMessageBeforeResponse?: AI.Node;
  genUIExamples?: AI.Node;

  /**
   * The role the model should take, like "a customer service agent for Help Scout".
   */
  role: string;
}

function makeObservedTools(tools: UseToolsProps['tools'], logger: AI.ComponentContext['logger']) {
  return _.mapValues(tools, (tool, toolName) => ({
    ...tool,
    func: (...args: Parameters<typeof tool.func>) => {
      logger.info({ toolName, args }, 'Calling tool');
      try {
        const result = tool.func(...args);
        Promise.resolve(result).then((result) => {
          logger.info({ toolName, args, result }, 'Got result from tool');
        });
        return result;
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
    <JsonifyWrapper>
      <ShowConversation present={present}>
        <ModelProvider model={props.model} modelProvider={props.modelProvider}>
          <UseTools
            tools={observedTools}
            showSteps
            finalSystemMessageBeforeResponse={props.finalSystemMessageBeforeResponse}
          >
            <SidekickSystemMessage
              timeZone={props.timeZone}
              timeZoneOffset={props.timeZoneOffset}
              role={props.role}
              userProvidedGenUIUsageExamples={props.genUIExamples}
            />
            {props.systemMessage}
            {props.conversationHistory}
          </UseTools>
        </ModelProvider>
      </ShowConversation>
    </JsonifyWrapper>
  );
}

function JsonifyWrapper({ children }: { children: AI.Node }) {
  return <>[{children}]</>;
}
