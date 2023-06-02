import { ChatCompletion, Completion, SystemMessage, UserMessage } from './completion-components.tsx';
import { LLMx, log } from './index.ts';
import z, { ZodTypeAny } from 'zod';
import { zodToJsonSchema } from 'zod-to-json-schema';
import { Inline, Scope } from './inline.tsx';
import { NaturalLanguageRouter, Route } from './natural-language-router.tsx';

export interface Tool {
  description: string;
  parameters: ZodTypeAny;
  func: (...args: any[]) => unknown;
}

const toolChoiceSchema = z.object({
  nameOfTool: z.string(),
  parameters: z.array(z.any()),
  responseToUser: z.string(),
});
export type ToolChoice = z.infer<typeof toolChoiceSchema> | null;

// This doesn't fundementally solve the problem of the model returning non-JSON output along with the JSON.
// function ChooseTools(props: { tools: Record<string, Tool>; query: string, contextData: string }): LLMx.Node {
//   const toolChoices = Object.entries(props.tools).map(([toolName, tool]) => (
//     <Route when={`Use ${toolName} to ${tool.description}`}>
//       <ChatCompletion>
//         <SystemMessage>
//           You are an expert tool-using agent. This is the only tool you can use:
//           Name: {toolName}.
//           Description: {tool.description}.
//           Parameters: {JSON.stringify(zodToJsonSchema(tool.parameters))}.
//           The user's data is: {props.contextData}.
//           When the user asks a question, use this tool to answer it, using any parts of their data that are relevant.
//         </SystemMessage>
//         <UserMessage>{props.query}</UserMessage>
//       </ChatCompletion>
//     </Route>
//   ));

//   toolChoices.push(<Route unmatched>
//     I'm sorry, but I'm not able to do that.
//   </Route>);

//   return <NaturalLanguageRouter query={props.query}>{toolChoices}</NaturalLanguageRouter>;
// }

function ChooseTools(props: { tools: Record<string, Tool>; query: string; userData: string }): LLMx.Node {
  // const inlineCompletionForOneField = <Inline>{(prompt) => <Completion stop={['"']}>{prompt}</Completion>}</Inline>;
  // const inlineCompletionOpenEnded = <Inline>{(prompt) => <Completion>{prompt}</Completion>}</Inline>;

  // return (
  //   <Scope>
  //     You are an expert agent who knows how to use tools. You can use the following tools:
  //     {Object.entries(props.tools).map(([toolName, tool]) => (
  //       <>
  //         {toolName}: Description: {tool.description}. Schema: {JSON.stringify(zodToJsonSchema(tool.parameters))}.
  //       </>
  //     ))}
  //     The user asked: {props.query}
  //     Do you want to use a tool, and if so, which one? Respond with a JSON object.
  //     {'{'}
  //     {'\n  '}"isAnyToolApplicable": "{inlineCompletionForOneField}",
  //     {'\n  '}"toolToUse": {'{'}
  //     {'\n  '}"name": "{inlineCompletionForOneField}",
  //     {'\n  '}"parameters": "{inlineCompletionOpenEnded}",
  //     {'\n  '}"responseToUser": "{inlineCompletionForOneField}",
  //     {'\n  '}
  //     {'}'}
  //     {'\n  '}
  //     {'}'}
  //   </Scope>
  // );
  return (
    <ChatCompletion>
      <SystemMessage>
        You are an expert agent who knows how to use tools. You can use the following tools:
        {Object.entries(props.tools).map(([toolName, tool]) => (
          <>
            {toolName}: Description: {tool.description}. Schema: {JSON.stringify(zodToJsonSchema(tool.parameters))}.
          </>
        ))}
        The user will ask you a question. Pick the tool that best addresses what they're looking for. Which tool do you
        want to use? Name the tool, identify the parameters, and generate a response to the user explaining what you're
        doing. Do not answer the user's question itself. Your answer should be a JSON object matching this schema:{' '}
        {JSON.stringify(zodToJsonSchema(toolChoiceSchema))}. Make sure to follow the schema strictly and do not include
        any explanatory prose prefix or suffix. When picking parameters, choose values according to this user data:{' '}
        {props.userData}
        If none of the tools seem appropriate, or the user data doesn't have the necessary context to use the tool the
        user needs, respond with `null`.
      </SystemMessage>
      <UserMessage>Generate a JSON response for this query: {props.query}</UserMessage>
    </ChatCompletion>
  );
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
    const error = new Error(
      `Failed to parse LLM output into a tool choice: ${e.message}. Output: ${toolChoiceLLMOutput}`
    );
    throw error;
  }
  if (!(toolChoiceResult.nameOfTool in props.tools)) {
    throw new Error(`LLM hallucinated a tool that does not exist: ${toolChoiceResult.nameOfTool}.`);
  }
  const tool = props.tools[toolChoiceResult.nameOfTool];
  const toolResult = await tool.func(...toolChoiceResult.parameters);
  log.info({ toolChoice: toolChoiceResult }, 'Invoking tool');

  return (
    <ChatCompletion>
      <SystemMessage>
        You are a tool-using agent. You previously choose to use a tool, and generated this response to the user:
        {toolChoiceResult.responseToUser}
        When you ran the tool, you got this result: {JSON.stringify(toolResult)}
        Using the above, provide a final response to the user.
      </SystemMessage>
    </ChatCompletion>
  );
}

export function UseTools(props: { tools: Record<string, Tool>; query: string; fallback: LLMx.Node; userData: string }) {
  return <InvokeTool tools={props.tools} toolChoice={<ChooseTools {...props} />} fallback={props.fallback} />;
}
