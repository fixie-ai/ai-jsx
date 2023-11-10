import { SystemMessage } from '../../../core/conversation.js';
import { MdxSystemMessage } from '../../../react/jit-ui/mdx.js';
import { MdxUsageExamples } from './gen-ui.js';
import { Node } from '../../../index.js';
import { SidekickOutputFormat } from './sidekick.js';

export interface SidekickSystemMessageProps {
  outputFormat: SidekickOutputFormat;
  includeNextStepsRecommendations: boolean;
  hasKnowledgeBase: boolean;
  useCitationCard: boolean;
  timeZone?: string;
  userProvidedGenUIUsageExamples?: Node;
  userProvidedGenUIComponentNames?: string[];
}

export function SidekickSystemMessage({
  timeZone,
  userProvidedGenUIUsageExamples,
  userProvidedGenUIComponentNames,
  includeNextStepsRecommendations,
  hasKnowledgeBase,
  useCitationCard,
  outputFormat,
}: SidekickSystemMessageProps) {
  /* Format: 'Friday, Nov 10, 2023, 1:46:34 PM' */
  const dateStringOptions = {
    weekday: 'long',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: 'numeric',
    second: 'numeric',
    hour12: true,
    timeZone,
  } as const;

  const dateTimeSystemMessage = (
    <>
      Current time: {new Date().toLocaleString('en-us', dateStringOptions)}.
      {timeZone ? `User's local time zone: ${timeZone}. When giving dates, use this time zone.` : ''}
      If a time is not specified by user, assume it is intended now or in the near future. Timestamps you provide should
      be human-readable.
    </>
  );

  const responseFormatSystemMessage = (
    <>Do not say "according to the documents I have been given", just answer as if you know the answer.</>
  );

  const styleSystemMessage = <>Speak politely but casually.</>;

  const baseComponentNames = [];
  if (includeNextStepsRecommendations) {
    baseComponentNames.push('NextStepsButton');
  }
  if (useCitationCard) {
    baseComponentNames.push('Citation');
  }

  const allComponents = [...baseComponentNames, ...(userProvidedGenUIComponentNames ?? [])];

  if (allComponents.length && outputFormat !== 'text/mdx') {
    throw new Error(
      `If you specify components for the Sidekick to use, you must set outputFormat to text/mdx. You specified components "${allComponents.join(
        '", "'
      )}", and outputFormat "${outputFormat}`
    );
  }

  /**
   * If the user passed text/mdx but did not pass any config that results in components being
   * available, we'll set the outputFormat to text/markdown instead, so we can omit the MDX
   * system message.
   */
  let outputFormatToUse = outputFormat;
  if (!allComponents.length && outputFormat === 'text/mdx') {
    outputFormatToUse = 'text/markdown';
  }

  return (
    <SystemMessage>
      {dateTimeSystemMessage}
      {hasKnowledgeBase && responseFormatSystemMessage}
      {styleSystemMessage}
      {outputFormatToUse === 'text/markdown' && <>Respond with Markdown.</>}
      {outputFormatToUse === 'text/mdx' && (
        <MdxSystemMessage
          componentNames={allComponents}
          usageExamples={
            <>
              <MdxUsageExamples
                includeNextStepsRecommendations={includeNextStepsRecommendations}
                useCitationCard={useCitationCard}
              />
              {userProvidedGenUIUsageExamples}
            </>
          }
        />
      )}
    </SystemMessage>
  );
}
