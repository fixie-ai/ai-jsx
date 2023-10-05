import { SystemMessage } from '../../../core/conversation.js';
import { MdxSystemMessage } from '../../../react/jit-ui/mdx.js';
import { MdxUsageExamples } from './gen-ui.js';
import { Node } from '../../../index.js';
import { SidekickProps } from './sidekick.js';

export interface SidekickSystemMessageProps
  extends Pick<SidekickProps, 'outputFormat' | 'includeNextStepsRecommendations' | 'useCitationCard'> {
  timeZone: string;
  userProvidedGenUIUsageExamples?: Node;
  userProvidedGenUIComponentNames?: string[];
}

export function SidekickSystemMessage({
  timeZone,
  userProvidedGenUIUsageExamples,
  userProvidedGenUIComponentNames,
  includeNextStepsRecommendations,
  useCitationCard,
  outputFormat,
}: SidekickSystemMessageProps) {
  const daysOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const currentDate = daysOfWeek[new Date().getDay()];

  const dateTimeSystemMessage = (
    <SystemMessage>
      The current date and time is: {new Date().toLocaleString()}. The current day of the week is: {currentDate}. The
      user's local time zone is {timeZone}. When giving dates, use the user's time zone. If the user does not specify a
      date or time, assume it is intended either now or in the near future.
    </SystemMessage>
  );

  const responseFramingSystemMessage = (
    <SystemMessage>
      Do not say "according to the documents I have been given", just answer as if you know the answer. When you see
      timestamps in your source data, format them in a human-readable way. Speak politely but casually. Say `use`
      instead of `utilize`.
    </SystemMessage>
  );

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
    <>
      {dateTimeSystemMessage}
      {responseFramingSystemMessage}
      {outputFormatToUse === 'text/markdown' && <SystemMessage>Respond with Markdown.</SystemMessage>}
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
    </>
  );
}
