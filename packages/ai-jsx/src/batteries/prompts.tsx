/**
 * This module provides some basic prompts for LLMs.
 *
 * Prompting is still a developing field. There are many different ways to prompt an LLM.
 * This file attempts to provide some good defaults as a starting point.
 * @packageDocumentation
 */
import { SystemMessage } from '../core/completion.js';

/**
 * A prompt collection with some useful defaults to get you started.
 * By default all prompts are disabled to make it easier to combine them.
 *
 * There is no guarantee that the model will follow the prompts, but LLMs have
 * shown great adaptability to prompts.
 *
 * We intend to improve this collection over time and welcome contributions.
 *
 * Note: even though a {@link SystemPrompt} component is used, you can think of this as a default value.
 * For example:
 *   * if used in a Completion model, the SystemPrompt will be ignored;
 *   * if wrapped with a UserMessage, the SystemPrompt will be stripped.
 *
 * @example
 * ```tsx
 *  <ChatCompletion>
 *    <Prompt persona="A cat with a PhD in physics" />
 *    <UserMessage>What is the meaning of life?</UserMessage>
 *  </ChatCompletion>
 * ```
 */
export function Prompt({
  hhh = false,
  apolitical = false,
  persona = null,
  concise = false,
  noInternalKnowledge = false,
  stepByStep = false,
}: {
  /** refers to the prompt "helpful, harmless, and honest assistant" */
  hhh?: boolean;
  /** asks the model to not offer opinions on political topics */
  apolitical?: boolean;
  /** asks the model to respond with a certain persona. LLMs are trained to
   *    output the average response even if it's wrong. A simple nudge can sometimes get
   *    the model to output better responses.
   *
   *    Example values:
   *      - an expert in astrophysics
   *      - Albert Einstein
   *      - a 5 year old
   *      - a tactful politician.
   *
   *    @see https://arxiv.org/pdf/2305.14930.pdf
   *    @see https://arxiv.org/pdf/2111.02080.pdf */
  persona?: string | null;
  /** asks the model to be concise */
  concise?: boolean;
  /** asks the model to only use the given context to answer instead of baked-in knowledge.
   *  This is useful for knowledge-grounded question answering (DocsQA). */
  noInternalKnowledge?: boolean;
  /** asks the model to work out the answer in a step-by-step way.
   *      @see  {@link PromptStepByStep} for more info */
  stepByStep?: boolean;
}) {
  return (
    <SystemMessage>
      {hhh ? 'You are a helpful, harmless, and honest assistant.' : ''}
      {persona ? `Respond as if you were ${persona}.` : ''}
      {apolitical ? 'You do not offer opinions on political topics.' : ''}
      {concise ? 'Be concise.' : ''}
      {noInternalKnowledge
        ? 'You should strictly only use the given context to answer. Do not use any other knowledge you have about the world.'
        : ''}
      {stepByStep ? <PromptStepByStep /> : ''}
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
 * ```tsx
 *   <ChatCompletion>
 *    <UserMessage>What is the 4th word in the phrase "I am not what I am"?</UserMessage>
 *    <PromptStepByStep />
 *   </ChatCompletion>
 * ```
 */
export function PromptStepByStep() {
  return <SystemMessage>Let's work this out in a step by step way to be sure we have the right answer.</SystemMessage>;
}
