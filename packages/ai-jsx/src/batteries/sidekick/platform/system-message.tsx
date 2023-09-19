import { SystemMessage } from '../../../core/conversation.js';
import { MdxSystemMessage } from '../../../react/jit-ui/mdx.js';
import { Prompt } from '../../prompts.js';
import { mdxUsageExamples } from './gen-ui.js';
import { Node } from '../../../index.js';
import { SidekickProps } from './sidekick.js';

export interface SidekickSystemMessageProps extends Pick<SidekickProps, 'outputFormat'> {
  timeZone: string;
  timeZoneOffset: string;
  userProvidedGenUIUsageExamples?: Node;
  userProvidedGenUIComponentNames?: string[];
  role: string;
}

export function SidekickSystemMessage({
  timeZone,
  timeZoneOffset,
  userProvidedGenUIUsageExamples,
  userProvidedGenUIComponentNames,
  outputFormat,
  role,
}: SidekickSystemMessageProps) {
  const daysOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const currentDate = daysOfWeek[new Date().getDay()];

  const dateTimeSystemMessage = (
    <SystemMessage>
      The current date and time is: {new Date().toLocaleString()}. The current day of the week is: {currentDate}. The
      user's local time zone is {timeZone}, which has an offset from UTC of {timeZoneOffset}. When giving dates, use the
      user's time zone. If the user does not specify a date or time, assume it is intended either now or in the near
      future.
    </SystemMessage>
  );

  const responseFramingSystemMessage = (
    <SystemMessage>
      Do not say "according to the documents I have been given"; just answer as if you know the answer. When you see
      timestamps in your source data, format them in a nice, human-readable way. Speak politely but casually. Say `use`
      instead of `utilize`.
    </SystemMessage>
  );

  return (
    <>
      {dateTimeSystemMessage}
      {responseFramingSystemMessage}
      <SystemMessage>
        <Prompt apolitical concise persona={`expert ${role}`} />
        {responseFramingSystemMessage}
      </SystemMessage>
      <SystemMessage>
        If the user asks something that is impossible, tell them **up-front** it is impossible. You can still write
        relevant helpful comments, but do not lead the user to think something can be done when it cannot be.
      </SystemMessage>
      {outputFormat === 'text/markdown' && <SystemMessage>Respond with Markdown.</SystemMessage>}
      {outputFormat === 'text/gen-ui' && (
        <MdxSystemMessage
          componentNames={['Card', 'Citation', 'NextStepsButton', ...(userProvidedGenUIComponentNames ?? [])]}
          usageExamples={
            <>
              {mdxUsageExamples}
              {userProvidedGenUIUsageExamples}
            </>
          }
        />
      )}
    </>
  );
}
