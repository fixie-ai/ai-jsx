import { present } from './conversation.js';
import { UseTools } from './use-tools-eject.js';
import { SidekickSystemMessage } from './system-message.js';
import { UseToolsProps } from '../../use-tools.js';
import * as AI from '../../../index.js';
import { ConversationHistory, ShowConversation } from '../../../core/conversation.js';
import { MergeExclusive } from 'type-fest';

interface UniversalSidekickProps {
  tools?: UseToolsProps['tools'];
  systemMessage?: AI.Node;
}

type OutputFormatSidekickProps = MergeExclusive<
  {
    /**
     * The output format that the Sidekick should use.
     *
     * `text/mdx` indicates that the Sidekick should output MDX, which is Markdown with
     * additional JSX elements, such as buttons.
     *
     * `text/markdown` indicates that the Sidekick should output plain Markdown.
     *
     * `text/plain` indicates that the Sidekick should output plain text.
     */
    outputFormat: 'text/mdx';

    /**
     * A set of examples to the Sidekick instructing it how to emit MDX responses, when
     * `outputFormat` is `text/mdx`.
     *
     * Separately, the Sidekick will emit MDX components if the `includeNextStepsRecommendations` and `useCitationCard`
     * props are set.
     */
    genUIExamples?: AI.Node;

    /**
     * A set of component names that the Sidekick should be able to use in its
     * MDX output, when `outputFormat` is `text/mdx`.
     *
     * Separately, the Sidekick will emit MDX components if the `includeNextStepsRecommendations` and `useCitationCard`
     * props are set.
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
    includeNextStepsRecommendations: boolean;

    /**
     * If true, the Sidekick will emit a `Citation` component when it wants to cite a source. For example:
     *
     *   <Citation title='How to cancel an order' href='https://docs.example.com/how-to-cancel-order' />
     */
    useCitationCard: boolean;
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
    <ShowConversation present={present}>
      <UseTools tools={props.tools ?? undefined} showSteps>
        <SidekickSystemMessage
          timeZone="America/Los_Angeles"
          includeNextStepsRecommendations={props.includeNextStepsRecommendations}
          useCitationCard={props.useCitationCard}
          outputFormat={props.outputFormat}
          userProvidedGenUIUsageExamples={props.genUIExamples}
          userProvidedGenUIComponentNames={props.genUIComponentNames}
        />
        <ConversationHistory />
        {props.systemMessage}
      </UseTools>
    </ShowConversation>
  );
}
