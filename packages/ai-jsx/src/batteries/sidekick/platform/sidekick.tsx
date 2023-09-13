import { present } from './conversation.js';
import { UseTools } from './use-tools-eject.js';
import { SidekickSystemMessage } from './system-message.js';
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

export function Sidekick(props: SidekickProps) {
  return (
    <ModelProvider model="gpt-4-32k" modelProvider="openai">
      <ShowConversation present={present}>
        <UseTools
          tools={props.tools ?? {}}
          showSteps
          finalSystemMessageBeforeResponse={props.finalSystemMessageBeforeResponse}
        >
          <SidekickSystemMessage
            timeZone="America/Los_Angeles"
            timeZoneOffset="420"
            role={props.role}
            userProvidedGenUIUsageExamples={props.genUIExamples}
            userProvidedGenUIComponentNames={props.genUIComponentNames}
          />
          {props.systemMessage}
          <ConversationHistory />
        </UseTools>
      </ShowConversation>
    </ModelProvider>
  );
}
