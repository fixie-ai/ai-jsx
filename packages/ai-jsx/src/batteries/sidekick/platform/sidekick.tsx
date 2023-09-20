import { present } from './conversation.js';
import { UseTools } from './use-tools-eject.js';
import { SidekickSystemMessage } from './system-message.js';
import { OpenAI } from '../../../lib/openai.js';
import { UseToolsProps } from '../../use-tools.js';
import * as AI from '../../../index.js';
import { ConversationHistory, ShowConversation } from '../../../core/conversation.js';
import { MergeExclusive } from 'type-fest';

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

interface UniversalSidekickProps {
  tools?: UseToolsProps['tools'];
  systemMessage?: AI.Node;
  finalSystemMessageBeforeResponse?: AI.Node;

  /**
   * The role the model should take, like "a customer service agent for my_company_name".
   */
  role: string;
}

type OutputFormatSidekickProps = MergeExclusive<
  {
    /**
     * Pass `text/gen-ui`, or omit this field, to get a Gen UI response.
     * To render this, you'll need an MDX compiler that's aware of the Gen UI components.
     */
    outputFormat?: 'text/mdx' | undefined;

    genUIExamples?: AI.Node;
    genUIComponentNames?: string[];

    /**
     * If true, the Sidekick will emit next steps recommendations, such as:
     *
     *    ...and that's some detail about your most recent order.
     *
     *    <NextStepsButton prompt='What other orders are there?' />
     *    <NextStepsButton prompt='How do I cancel the order?' />
     *    <NextStepsButton prompt='How do I resubmit the order?' />
     *
     * Defaults to true.
     */
    includeNextStepsRecommendations?: boolean;
  },
  {
    /**
     * Pass `text/markdown` to get a Markdown response. To render this, you'll need a Markdown compiler.
     *
     * Pass `text/plain` to get a plain text response.
     */
    outputFormat: 'text/markdown' | 'text/plain';
  }
>;

export type SidekickProps = UniversalSidekickProps & OutputFormatSidekickProps;

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
            includeNextStepsRecommendations={props.includeNextStepsRecommendations ?? true}
            outputFormat={props.outputFormat ?? 'text/mdx'}
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
