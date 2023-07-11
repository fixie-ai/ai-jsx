/**
 * This module defines affordances for constraining the output of the model
 * into specific formats, such as JSON, YAML, or Markdown.
 * @packageDocumentation
 */

import * as AI from '../index.js';
import {
  ChatCompletion,
  SystemMessage,
  AssistantMessage,
  UserMessage,
  FunctionCall,
  ModelPropsWithChildren,
} from '../core/completion.js';
import yaml from 'js-yaml';
import { AIJSXError, ErrorCode, ErrorBlame } from '../core/errors.js';
import { Jsonifiable } from 'type-fest';
import z from 'zod';
import { zodToJsonSchema } from 'zod-to-json-schema';
import untruncateJson from 'untruncate-json';

export type ObjectCompletion = ModelPropsWithChildren & {
  /** Validators are used to ensure that the final object looks as expected. */
  validators?: ((obj: object) => void)[];
  /**
   * The object Schema that is required. This is a type of validator with the exception
   * that the schema description is also provided to the model.
   */
  schema?: z.Schema;
  /** Any output example to be shown to the model. */
  example?: string;
  // TODO (@farzad): better name/framing for example.
};

export type TypedObjectCompletion = ObjectCompletion & {
  /** Human-readable name of the type, e.g. JSON or YAML. */
  typeName: string;
  /**
   * Object parser: creates the object to be evaluated given the string.
   * Note: the parser is only used for validation. The final output is still a string.
   */
  parser: (str: string) => object;
  /**
   * The intermediate results that get yielded might be incomplete and as such
   * a cleaning/healing/untruncating step might be required.
   * For example, see the `untruncate-json` package.
   */
  partialResultCleaner?: (str: string) => string;
};

export type TypedObjectCompletionWithRetry = TypedObjectCompletion & { retries?: number };

/**
 * A {@link ChatCompletion} component that constrains the output to be a valid JSON string.
 * It uses a combination of prompt engineering and validation with retries to ensure that the output is valid.
 *
 * Though not required, you can provide a Zod schema to validate the output against. This is useful for
 * ensuring that the output is of the expected type.
 *
 * @example
 * ```tsx
 * const FamilyTree: z.Schema = z.array(
 *   z.object({
 *     name: z.string(),
 *     children: z.lazy(() => FamilyTree).optional(),
 *   })
 * );
 *
 * return (
 *    <JsonChatCompletion>
 *     <UserMessage>
 *      Create a nested family tree with names and ages.
 *      It should include a total of 5 people.
 *     </UserMessage>
 *    </JsonChatCompletion>
 * );
 * ```
 * @returns A string that is a valid JSON or throws an error after `retries` attempts.
 *    Intermediate results that are valid, are also yielded.
 */
export async function* JsonChatCompletion(
  { schema, ...props }: Omit<TypedObjectCompletionWithRetry, 'typeName' | 'parser' | 'partialResultCleaner'>,
  { render }: AI.ComponentContext
) {
  if (schema) {
    try {
      return yield* render(<JsonChatCompletionFunctionCall schema={schema} {...props} />);
    } catch (e: any) {
      if (e.code !== ErrorCode.ChatModelDoesNotSupportFunctions) {
        throw e;
      }
    }
  }
  return yield* render(
    <ObjectCompletionWithRetry
      {...props}
      typeName="JSON"
      parser={JSON.parse}
      // TODO: can we remove .default?
      partialResultCleaner={untruncateJson.default}
    />
  );
}

/**
 * A {@link ChatCompletion} component that constrains the output to be a valid YAML string.
 * It uses a combination of prompt engineering and validation with retries to ensure that the output is valid.
 *
 * Though not required, you can provide a Zod schema to validate the output against. This is useful for
 * ensuring that the output is of the expected type.
 *
 * @example
 * ```tsx
 * const FamilyTree: z.Schema = z.array(
 *   z.object({
 *     name: z.string(),
 *     children: z.lazy(() => FamilyTree).optional(),
 *   })
 * );
 *
 * return (
 *    <YamlChatCompletion>
 *     <UserMessage>
 *      Create a nested family tree with names and ages.
 *      It should include a total of 5 people.
 *     </UserMessage>
 *    </YamlChatCompletion>
 * );
 * ```
 * @returns A string that is a valid YAML or throws an error after `retries` attempts.
 *    Intermediate results that are valid, are also yielded.
 */
export async function* YamlChatCompletion(
  props: Omit<TypedObjectCompletionWithRetry, 'typeName' | 'parser'>,
  { render }: AI.ComponentContext
) {
  return yield* render(
    <ObjectCompletionWithRetry {...props} typeName="YAML" parser={yaml.load as (str: string) => object} />
  );
}

export class CompletionError extends AIJSXError {
  constructor(
    message: string,
    public readonly code: ErrorCode,
    public readonly blame: ErrorBlame,
    public readonly metadata: Jsonifiable & { output: string; validationError: string }
  ) {
    super(message, code, blame, metadata);
  }
}

/**
 * A {@link ChatCompletion} component that constrains the output to be a valid object format (e.g. JSON/YAML).
 *
 * Though not required, you can provide a Zod schema to validate the output against. This is useful for
 * ensuring that the output is of the expected type.
 *
 * @returns A string that validates as the given type or throws an error.
 *    Intermediate results that are valid, are also yielded.
 */
async function* OneShotObjectCompletion(
  { children, typeName, validators, example, schema, parser, partialResultCleaner, ...props }: TypedObjectCompletion,
  { render, logger }: AI.ComponentContext
) {
  // If a schema is provided, it is added to the list of validators as well as the prompt.
  const validatorsAndSchema = schema ? [schema.parse, ...(validators ?? [])] : validators ?? [];

  const childrenWithCompletion = (
    <ChatCompletion {...props}>
      {children}
      <SystemMessage>
        Respond with a {typeName} object that encodes your response.
        {schema
          ? `The ${typeName} object should match this JSON Schema: ${JSON.stringify(zodToJsonSchema(schema))}\n`
          : ''}
        {example ? `For example: ${example}\n` : ''}
        Respond with only the {typeName} object. Do not include any explanatory prose. Do not include ```
        {typeName.toLowerCase()} ``` code blocks.
      </SystemMessage>
    </ChatCompletion>
  );
  const renderGenerator = render(childrenWithCompletion)[Symbol.asyncIterator]();

  // TODO: we can possibly add a timelimit here so we don't emit too many times.
  let lastYieldedLen = 0;
  while (true) {
    const partial = await renderGenerator.next();
    const str = partialResultCleaner ? partialResultCleaner(partial.value) : partial.value;
    try {
      const object = parser(str);
      for (const validator of validatorsAndSchema) {
        validator(object);
      }
    } catch (e: any) {
      if (partial.done) {
        // logger.warn(
        //   { output: partial.value, cleaned: partialResultCleaner ? str : undefined, errorMessage: e.message },
        //   "ObjectCompletion failed. The final result either didn't parse or didn't validate."
        // );
        console.log('bad output:', partial.value);
        throw new AIJSXError(
          `The model did not produce a valid ${typeName} object`,
          ErrorCode.ModelOutputDidNotMatchConstraint,
          'runtime',
          {
            typeName,
            output: partial.value,
            validationError: e.message,
          }
        );
      }
      continue;
    }
    if (partial.done) {
      return str;
    }
    if (str.length > lastYieldedLen) {
      lastYieldedLen = str.length;
      yield str;
    }
  }

  // TODO: return an AIJSXError instead? The issue is I want to get the original (unmodified) error message somehow.
}

/**
 * A {@link ChatCompletion} component that constrains the output to be a valid object format (e.g. JSON/YAML).
 * If the first attempt fails, it will retry with a new prompt up to `retries` times.
 *
 * @returns A string that validates as the given type or throws an error after `retries` attempts
 *    Intermediate results that are valid, are also yielded.
 */
async function* ObjectCompletionWithRetry(
  { children, retries = 3, ...props }: TypedObjectCompletionWithRetry,
  { render, logger }: AI.ComponentContext
) {
  const childrenWithCompletion = <OneShotObjectCompletion {...props}>{children}</OneShotObjectCompletion>;

  let output;
  let validationError: string;
  try {
    output = yield* render(childrenWithCompletion);
    return output;
  } catch (e: any) {
    validationError = e.metadata.validationError;
    output = e.metadata.output;
  }

  logger.debug({ atempt: 1, expectedFormat: props.typeName, output }, `Output did not validate to ${props.typeName}.`);

  for (let retryIndex = 1; retryIndex < retries; retryIndex++) {
    const completionRetry = (
      <OneShotObjectCompletion {...props}>
        <SystemMessage>
          You are a {props.typeName} object generator. Create a {props.typeName} object (context redacted).
        </SystemMessage>
        <AssistantMessage>{output}</AssistantMessage>
        <UserMessage>
          Try again. Here's the validation error when trying to parse the output as {props.typeName}:{'\n'}
          ```log filename="error.log"{'\n'}
          {validationError}
          {'\n'}
          ```
          {'\n'}
          You must reformat your previous output to be a valid {props.typeName} object, but you must keep the same data.
        </UserMessage>
      </OneShotObjectCompletion>
    );

    try {
      output = yield* render(completionRetry);
      return output;
    } catch (e: any) {
      validationError = e.metadata.validationError;
      output = e.metadata.output;
    }

    logger.debug(
      { attempt: retryIndex + 1, expectedFormat: props.typeName, output },
      `Output did not validate to ${props.typeName}.`
    );
  }

  throw new AIJSXError(
    `The model did not produce a valid ${props.typeName} object, even after ${retries} attempts.`,
    ErrorCode.ModelOutputDidNotMatchConstraint,
    'runtime',
    {
      typeName: props.typeName,
      retries,
      output,
    }
  );
}

/**
 * A {@link ChatCompletion} component that constrains the output to be a valid JSON string.
 * It (ab)uses OpenAI function calls to generate the JSON string.
 *
 * @returns A string that is a valid JSON or throws an error.
 *
 * @hidden
 */
async function* JsonChatCompletionFunctionCall(
  { schema, children, ...props }: ModelPropsWithChildren & { schema: z.Schema },
  { render }: AI.ComponentContext
) {
  const childrenWithCompletion = (
    <ChatCompletion
      experimental_streamFunctionCallOnly
      {...props}
      functionDefinitions={{
        print: {
          description: 'Prints the response in a human readable format.',
          parameters: schema,
        },
      }}
    >
      {children}
      <SystemMessage>
        Your response must use the `print` function that is provided. No other explanation needed. do not respond with
        an assistant message. Just call the function.
      </SystemMessage>
    </ChatCompletion>
  );

  const frames = render(childrenWithCompletion);
  for await (const frame of frames) {
    yield JSON.stringify(JSON.parse(frame).arguments);
  }
  return JSON.stringify(JSON.parse(await frames).arguments);
}
