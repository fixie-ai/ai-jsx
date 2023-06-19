/**
 * This module defines affordances for constraining the output of the model
 * into specific formats, such as JSON, YAML, or Markdown.
 */
import * as AI from '../index.js';
import { ChatCompletion, SystemMessage, AssistantMessage, UserMessage } from '../core/completion.js';
import yaml from 'js-yaml';

interface ValidationResult {
  success: boolean;
  error: string;
}

// TODO: schema
/**
 * A ChatCompletion component that constrains the output to be a valid JSON string.
 *
 * @returns a string that is a valid JSON or throws an error after `retries` attempts
 */
export function JsonChatCompletion({ children, ...props }: { children: AI.Node }) {
  return (
    <ObjectFormatChatCompletion typeName="JSON" validator={isJsonString} {...{ ...props }}>
      {children}
    </ObjectFormatChatCompletion>
  );
}

/**
 * A ChatCompletion component that constrains the output to be a valid YAML string.
 *
 * @returns a string that is a valid YAML or throws an error after `retries` attempts
 */
export function YamlChatCompletion({ children, ...props }: { children: AI.Node }) {
  return (
    <ObjectFormatChatCompletion typeName="YAML" validator={isYamlString} {...{ ...props }}>
      {children}
    </ObjectFormatChatCompletion>
  );
}

/**
 * A ChatCompletion components that constrains the output to be a valid object format (e.g. JSON/YAML).
 *
 * @returns a string that validates as the given type or throws an error after `retries` attempts
 */
async function ObjectFormatChatCompletion(
  {
    retries = 3,
    validator,
    typeName,
    children,
    ...props
  }: {
    validator: (str: string) => ValidationResult;
    /** function that succeeds if output string is of the expected format */
    typeName: string;
    /** name of the type, to be used in the prompt */
    retries?: number;
    /** retries if output fails validation, how many times should we retry.
     * Note: you can have `1 + retries` LLM calls in total. */
    children: AI.Node;
  },
  { render, logger }: AI.ComponentContext
) {
  const childrenWithCompletion = (
    <ChatCompletion {...props}>
      {children}
      <SystemMessage>
        Your response must be a valid {typeName}. Do not include ```{typeName.toLowerCase()} ``` code blocks.
      </SystemMessage>
    </ChatCompletion>
  );

  let output = await render(childrenWithCompletion);
  let valiationResults = validator(output);
  if (valiationResults.success) {
    return output;
  }

  logger.debug({ atempt: 1, expectedFormat: typeName, output }, `Output did not validate to ${typeName}.`);

  for (let retryIndex = 1; retryIndex < retries; retryIndex++) {
    const completionRetry = (
      <ChatCompletion {...props}>
        <SystemMessage>
          You are a {typeName} object generator. Create a {typeName} object (context redacted).
        </SystemMessage>
        <AssistantMessage>{output}</AssistantMessage>
        <UserMessage>
          Try again. Here's the validation error when trying to parse the output as {typeName}:{'\n'}
          {valiationResults.error}
          {'\n'}
          You must reformat the string to be a valid {typeName} object, but you must keep the same data. Do not explain
          the issue, just return a string that can be parsed as {typeName} as-is. Do not include ```
          {typeName.toLocaleLowerCase()} ``` code blocks.
        </UserMessage>
      </ChatCompletion>
    );

    output = await render(completionRetry);
    valiationResults = validator(output);
    if (valiationResults.success) {
      return output;
    }

    logger.debug(
      { atempt: retryIndex + 1, expectedFormat: typeName, output },
      `Output did not validate to ${typeName}.`
    );
  }

  throw new Error(`The model did not produce a valid ${typeName} object, even after ${retries} attempts.`);
}

function isJsonString(str: string): ValidationResult {
  try {
    JSON.parse(str);
    return { success: true, error: '' };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}

function isYamlString(str: string): ValidationResult {
  try {
    yaml.load(str);
    return { success: true, error: '' } as ValidationResult;
  } catch (e: any) {
    return { success: false, error: e.message } as ValidationResult;
  }
}
