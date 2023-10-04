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
}

type OutputFormatSidekickProps = MergeExclusive<
  {
    /**
     * The output format that the Sidekick should use. Defaults to `text/mdx`.
     *
     * `text/mdx` indicates that the Sidekick should output MDX, which is Markdown with
     * additional JSX elements, such as buttons.
     *
     * `text/markdown` indicates that the Sidekick should output plain Markdown.
     *
     * `text/plain` indicates that the Sidekick should output plain text.
     */
    outputFormat?: 'text/mdx' | undefined;

    /**
     * A set of examples to the Sidekick instructing it how to emit MDX responses, when
     * `outputFormat` is `text/mdx`.
     *
     * By default, the Sidekick will only be able to use the default set of
     * MDX components in its vocabulary: `Citation` and `NextStepsButton`.
     * If you wish to support additional MDX components, you must provide examples
     * of how to use them here.
     */
    genUIExamples?: AI.Node;

    /**
     * A set of component names that the Sidekick should be able to use in its
     * MDX output, when `outputFormat` is `text/mdx`.
     *
     * By default, the Sidekick will only be able to use the default set of
     * MDX components in its vocabulary: `Citation` and `NextStepsButton`.
     * If you wish to support additional MDX components, you must provide their
     * names here.
     */
    genUIComponentNames?: string[];

    /**
     * If true, the Sidekick will emit next steps recommendations using the
     * `NextStepsButton` component. `outputFormat` must be set to `text/mdx` for this
     * to work. For example:
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
     * Pass `text/markdown` to get a Markdown response.
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
        <UseTools tools={props.tools ?? {}} showSteps>
          <SidekickSystemMessage
            timeZone="America/Los_Angeles"
            includeNextStepsRecommendations={props.includeNextStepsRecommendations ?? true}
            outputFormat={props.outputFormat ?? 'text/mdx'}
            userProvidedGenUIUsageExamples={props.genUIExamples}
            userProvidedGenUIComponentNames={props.genUIComponentNames}
          />
          <ConversationHistory />
          {props.systemMessage}
        </UseTools>
      </ShowConversation>
    </ModelProvider>
  );
}
