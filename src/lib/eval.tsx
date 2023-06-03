import { ChatCompletion, SystemMessage, UserMessage } from './completion-components.js';
import { LLMx } from './index.js';

function GradeAnswer(props: { answer: LLMx.Node; query: LLMx.Node }) {
  return (
    <ChatCompletion>
      <SystemMessage>
        You are an expert evaluator of AI systems. You look at pairs of human questions and AI responses, and respond
        with your analysis on whether the answer is good. Respond in the form: Grade: one of A, B, C, D, F\n Reasoning:
        a short explanation of why you gave that grade. The user's question was: {props.query}. The answer will be sent
        to you next. Do not respond with your own take on how to answer the question. Just evaluate the answer that was
        already given.
      </SystemMessage>
      <UserMessage>{props.answer}</UserMessage>
    </ChatCompletion>
  );
}

export function Eval(props: { query: LLMx.Node; answer: LLMx.Node }) {
  return (
    <>
      Q: {props.query}
      {'\n'}
      A: {props.answer}
      {'\n'}
      <GradeAnswer answer={props.answer} query={props.query} />
      {'\n'}
      {'\n'}
      {'\n'}
    </>
  );
}
