/**
 * This module defines affordances for constraining the output of the model
 * into specific formats, such as JSON, YAML, or Markdown.
 */
import * as LLMx from '../index.js';
import { ChatCompletion, SystemMessage, AssistantMessage, UserMessage } from './completion';
import { memo } from './memoize';
import yaml from 'js-yaml';

function isJsonString(str: string): boolean | string {
  try {
    JSON.parse(str);
  } catch (e: any) {
    return e.message;
  }
  return true;
}

function isYamlString(str: string): boolean | string {
  try {
    // try to parse the string as YAML
    yaml.load(str);
  } catch (e: any) {
    return e.message;
  }
  return true;
}

/**
 * ChatCompletion that constrains the output to be a valid object format (e.g. JSON/YAML).
 *
 *
 * @param type_name name of the type, to be used in the prompt
 * @param validator function that returns true if the output is valid, or a string with an error message if not
 *     // TODO: what should the signature of this function be?
 * @param retries if output fails validation, how many times should we retry?
 * @param verbose returns intermediate output if true
 * @returns a string that validates as the given type (TODO: should I return the parsed object instead?)
 */
async function* ObjectFormatChatCompletion(
  {
    retries = 2,
    verbose = false,
    validator,
    type_name,
    children,
    ...props
  }: {
    validator: (output: string) => boolean | string;
    type_name: string;
    retries?: number;
    verbose?: boolean;
    children: LLMx.Node[];
  },
  { render }: LLMx.RenderContext
) {
  const childrenWithCompletion = memo(
    <ChatCompletion {...props}>
      {children}
      <SystemMessage>
        Your response must be a valid {type_name}. Do not include ```{type_name.toLowerCase()} ``` code blocks.
      </SystemMessage>
    </ChatCompletion>
  );

  if (verbose) yield childrenWithCompletion;

  let output = await render(childrenWithCompletion);
  let valiationResults = validator(output);
  if (valiationResults === true) {
    return output;
  } else {
    if (verbose) yield `Intermediate output did not validate: '''${output}'''`;

    for (let i = 0; i < retries; i++) {
      const completionRetry = memo(
        <ChatCompletion {...props}>
          <SystemMessage>
            You are a {type_name} object generator. Create a {type_name} object (context redacted).
          </SystemMessage>
          <AssistantMessage>{output}</AssistantMessage>
          <UserMessage>
            Try again. Here's the validation error when trying to parse the output as {type_name}:{'\n'}
            {valiationResults}
            {'\n'}
            You must reformat the string to be a valid {type_name} object, but you must keep the same data. Do not
            explain the issue, just return a string that can be parsed as {type_name} as-is. Do not include ```
            {type_name.toLocaleLowerCase()} ``` code blocks.
          </UserMessage>
        </ChatCompletion>
      );

      if (verbose) yield completionRetry;

      output = await render(completionRetry);
      valiationResults = validator(output);
      if (valiationResults === true) {
        return output;
      }

      if (verbose) yield `Intermediate output did not validate: '''${output}'''`;
    }
  }
  // TODO: throw error or fail silently with a message?
  throw new Error(`Could not create a valid ${type_name} object. Please try again.`);
}

// TODO: schema
export function JsonChatCompletion({
  retries = 2,
  verbose = false,
  children,
  ...props
}: {
  retries?: number;
  verbose?: boolean;
  children: LLMx.Node[];
}) {
  return (
    <ObjectFormatChatCompletion type_name="JSON" validator={isJsonString} {...{ retries, verbose, ...props }}>
      {children}
    </ObjectFormatChatCompletion>
  );
}

export function YamlChatCompletion({
  retries = 2,
  verbose = false,
  children,
  ...props
}: {
  retries?: number;
  verbose?: boolean;
  children: LLMx.Node[];
}) {
  return (
    <ObjectFormatChatCompletion type_name="YAML" validator={isYamlString} {...{ retries, verbose, ...props }}>
      {children}
    </ObjectFormatChatCompletion>
  );
}
