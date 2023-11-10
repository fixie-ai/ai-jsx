import { getNextConversationStep, present } from './conversation.js';
import { SidekickSystemMessage } from './system-message.js';
import { UseToolsProps } from '../../use-tools.js';
import * as AI from '../../../index.js';
import { ConversationHistory, Converse, ShowConversation } from '../../../core/conversation.js';
import { MergeExclusive } from 'type-fest';

interface UniversalSidekickProps {
  tools?: UseToolsProps['tools'];
  systemMessage?: AI.Node;

  /**
   * The conversation to act on. If not specified, uses the <ConversationHistory /> component.
   */
  children?: AI.Node;
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
     * Separately from that's passed here, the Sidekick will emit MDX components if the
     * `includeNextStepsRecommendations` and `useCitationCard` props are set.
     */
    genUIExamples?: AI.Node;

    /**
     * A set of component names that the Sidekick should be able to use in its
     * MDX output, when `outputFormat` is `text/mdx`.
     *
     * Separately from that's passed here, the Sidekick will emit MDX components if the
     * `includeNextStepsRecommendations` and `useCitationCard` props are set.
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

    /**
     * If true, the Sidekick will emit a `Citation` component when it wants to cite a source. For example:
     *
     *   <Citation title='How to cancel an order' href='https://docs.example.com/how-to-cancel-order' />
     */
    useCitationCard?: boolean;
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

export type SidekickOutputFormat = Exclude<SidekickProps['outputFormat'], undefined>;

export function Sidekick(props: SidekickProps) {
  const outputFormat = props.outputFormat ?? 'text/mdx';
  return (
    <ShowConversation present={(msg) => present(msg, outputFormat)}>
      <Converse
        reply={(messages, fullConversation) =>
          getNextConversationStep(messages, fullConversation, outputFormat, props.tools)
        }
      >
        {props.systemMessage}
        <SidekickSystemMessage
          // TODO: get timeZone from the user's browser
          includeNextStepsRecommendations={
            outputFormat === 'text/mdx' && (props.includeNextStepsRecommendations ?? true)
          }
          // check if there are any tools instead of explicitly checking if there's a knowledge base
          hasKnowledgeBase={Object.keys(props.tools ?? {}).length === 0}
          useCitationCard={outputFormat === 'text/mdx' && (props.useCitationCard ?? true)}
          outputFormat={outputFormat}
          userProvidedGenUIUsageExamples={props.genUIExamples}
          userProvidedGenUIComponentNames={props.genUIComponentNames}
        />
        {props.children ?? <ConversationHistory />}
      </Converse>
    </ShowConversation>
  );
}
