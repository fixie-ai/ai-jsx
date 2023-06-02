import { ChatCompletion, Completion, SystemMessage, UserMessage } from './completion-components.tsx';
import { LLMx, log } from './index.ts';
import z, { ZodTypeAny } from 'zod';
import { zodToJsonSchema } from 'zod-to-json-schema';
import { Inline, Scope } from './inline.tsx';
import { NaturalLanguageRouter } from './natural-language-router.tsx';

export interface Tool {
  description: string;
  parameters: ZodTypeAny;
  func: (...args: any[]) => any;
}

const toolChoiceSchema = z.object({
  nameOfTool: z.string(),
  parameters: z.array(z.any()),
  responseToUser: z.string(),
});
export type ToolChoice = z.infer<typeof toolChoiceSchema> | null;

function ChooseTools(props: { tools: Record<string, Tool>; query: string }): LLMx.Node {
  // const toolChoices = Object.entries(props.tools).map(([toolName, tool]) => <Route when={`The user wants to use ${toolName} to ${tool.description}`}>
  // return <NaturalLanguageRouter query={query}>

  // </NaturalLanguageRouter>


  const inlineCompletionForOneField = (
    <Inline>
      {(prompt) => (
        <Completion stop={['"']}>
          {prompt}
        </Completion>
      )}
    </Inline>
  );
  const inlineCompletionOpenEnded = (
    <Inline>
      {(prompt) => (
        <Completion>
          {prompt}
        </Completion>
      )}
    </Inline>
  );

  return <Scope>
    You are an expert agent who knows how to use tools. You can use the following tools:
    {Object.entries(props.tools).map(([toolName, tool]) => (
      <>
        {toolName}: Description: {tool.description}. Schema: {JSON.stringify(zodToJsonSchema(tool.parameters))}.
      </>
    ))}
    The user asked: {props.query}

    Do you want to use a tool, and if so, which one? Respond with a JSON object.
    {'{'}
      {'\n  '}"isAnyToolApplicable": "{inlineCompletionForOneField}",
      {'\n  '}"toolToUse": {'{'}
        {'\n  '}"name": "{inlineCompletionForOneField}",
        {'\n  '}"parameters": "{inlineCompletionOpenEnded}",
        {'\n  '}"responseToUser": "{inlineCompletionForOneField}",
      {'\n  '}{'}'}
      {'\n  '}{'}'}
  </Scope>
  // return (
  //   <ChatCompletion>
  //     <SystemMessage>
  //       You are an expert agent who knows how to use tools. You can use the following tools:
  //       {Object.entries(props.tools).map(([toolName, tool]) => (
  //         <>
  //           {toolName}: Description: {tool.description}. Schema: {JSON.stringify(zodToJsonSchema(tool.parameters))}.
  //         </>
  //       ))}
  //       The user will ask you a question. Pick the tool that best addresses what they're looking for. Which tool do you
  //       want to use? Name the tool, identify the parameters, and generate a response to the user explaining what you're
  //       doing. Do not answer the user's question itself. Your answer should be a JSON object matching this schema:{' '}
  //       {JSON.stringify(zodToJsonSchema(toolChoiceSchema))}. Do not respond with anything other than this JSON object.
  //       If none of the tools seem appropriate, respond with `null`.
  //     </SystemMessage>
  //     <UserMessage>{props.query}</UserMessage>
  //   </ChatCompletion>
  // );
}

async function InvokeTool(props: { tools: Record<string, Tool>; toolChoice: LLMx.Node; fallback: LLMx.Node }) {
  // TODO: better validation around when this produces unexpected output.
  const toolChoiceLLMOutput = await LLMx.render(props.toolChoice);
  let toolChoiceResult: ToolChoice;
  try {
    const parsedJson = JSON.parse(toolChoiceLLMOutput);
    if (parsedJson === null) {
      return props.fallback;
    }
    toolChoiceResult = toolChoiceSchema.parse(parsedJson);
  } catch (e: any) {
    const error = new Error(`Failed to parse LLM output into a tool choice: ${e.message}. Output: ${toolChoiceLLMOutput}`);
    throw error;
  }
  if (!(toolChoiceResult.nameOfTool in props.tools)) {
    throw new Error(`LLM hallucinated a tool that does not exist: ${toolChoiceResult.nameOfTool}.`);
  }
  const tool = props.tools[toolChoiceResult.nameOfTool];
  await tool.func(...toolChoiceResult.parameters);
  log.info({ toolChoice: toolChoiceResult }, 'Invoking tool');
  return toolChoiceResult.responseToUser;
}

export function UseTools(props: { tools: Record<string, Tool>; query: string; fallback: LLMx.Node }) {
  return <InvokeTool tools={props.tools} toolChoice={<ChooseTools {...props} />} fallback={props.fallback} />;
}
