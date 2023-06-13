/**
 * Basic prompts for LLMs.
 * This file attemps to have suggestions to guide the thinking of inexperienced users
 * to use good practices when using LLMs.
 *
 * Prompting is still a developing field. There are many different ways to prompt an LLM.
 * This file attempts to provide some good defaults as a starting point.
 */
import * as LLMx from '../index.js';
import { SystemMessage } from './completion';

/**
 * A (system) prompt collection with some useful defaults to get you started.
 * By default all prompts are disabled to make it easier for combining them.
 *
 * We intend to improve this collection over time and welcome contributions.
 * Potentially, the prompts can be adjusted based on the model being used.
 *
 * Note: even though a SystemPrompt component is used, this component can be used
 * via a plain Completion model as well.
 *
 * @param hhh refers to the prompt "helpful, harmless, and honest assistant"
 * @param apolitical asks the model to not offer opinions on political topics
 * @param persona asks the model to respond with a certain persona. LLMs are trained to
 *    output the average response even if it's wrong. A simple nudge can sometimes get
 *    the model to output better responses.
 *
 *    Example values:
 *      * an expert in astrophysics
 *      * Albert Einstein
 *      * a 5 year old
 *      * a tactful politician
 *
 *    @see https://arxiv.org/pdf/2305.14930.pdf
 *    @see https://arxiv.org/pdf/2111.02080.pdf
 *
 *  @param beconcise asks the model to be concise
 *  @param no_internal_knowledge asks the model to only use the given context to answer instead of baked-in knowledge.
 *      This is useful for knowledge-grounded question answering (DocsQA).
 *  @param step_by_step asks the model to work out the answer in a step-by-step way.
 *      @see PromptStepByStep for more info
 */
export function Prompt({
  hhh = false,
  apolitical = false,
  persona = null,
  beconcise = false,
  no_internal_knowledge = false,
  step_by_step = false,
}: {
  hhh?: boolean;
  apolitical?: boolean;
  persona?: string | null;
  // expert?: string | null;
  beconcise?: boolean;
  no_internal_knowledge?: boolean;
  step_by_step?: boolean;
}) {
  return (
    <SystemMessage>
      {hhh ? 'You are a helpful, harmless, and honest assistant.' : ''}
      {persona ? `Respond as if you were ${persona}.` : ''}
      {apolitical ? 'You do not offer opinions on political topics.' : ''}
      {beconcise ? 'Be concise.' : ''}
      {no_internal_knowledge
        ? 'You should strictly only use the given context to answer. Do not use any other knowledge you have about the world.'
        : ''}
      {step_by_step ? <PromptStepByStep /> : ''}
    </SystemMessage>
  );
}

/**
 * Zero-shot Chain-of-Thought prompt.
 *
 * This specific prompt was proposed in APE paper (https://arxiv.org/pdf/2211.01910.pdf)
 * See Table 7 in Appendix C for comparison.
 *
 * @example
 *   <ChatCompletion>
 *    <Prompt expert="logicial" />
 *    <PromptStepByStep />
 *    <UserMessage>
 *      Johny and Matt decided to play rock-paper-scissors. They bet $1 on each game they played.
 *      Johny won three of the games but Matt walks away $5 richer. How many games did they play?
 *    </UserMessage>
 *   </ChatCompletion>
 *
 * @TODO (Farzad): add another example; this doesn't always work.
 */
export function PromptStepByStep() {
  return <SystemMessage>Let's work this out in a step by step way to be sure we have the right answer.</SystemMessage>;
}
