import _ from 'lodash';
import { Jsonifiable } from 'type-fest';

export enum ErrorCode {
  MissingCompletionModel = 1000,
  MissingChatModel = 1001,
  MissingImageModel = 1002,
  UnrenderableType = 1003,
  GeneratorMustBeExhausted = 1004,
  GeneratorCannotBeUsedTwice = 1005,
  GeneratorCannotBeUsedAsIterableAfterAwaiting = 1006,
  UnexpectedRenderType = 1007,
  LogitBiasBadInput = 1008,
  ChatCompletionMissingChildren = 1009,
  ChatCompletionUnexpectedChild = 1010,
  ImageBadDimensions = 1011,
  ModelOutputDidNotMatchUIShape = 1012,
  AIJSXEndpointFailed = 1013,
  AIJSXEndpointHadEmptyResponse = 1014,
  NestedAIUIStreamsAreNotSupported = 1015,
  UnknownUIComponentId = 1016,
  UnknownSerializedComponentType = 1017,
  AnthropicDoesNotSupportCompletionModels = 1018,
  AnthropicDoesNotSupportSystemMessage = 1019,
  AnthropicDoesNotSupportFunctions = 1020,
  AnthropicAPIError = 1021,

  ModelOutputDidNotMatchConstraint = 2000,

  UnsupportedMimeType = 2001,
  MissingFixieAPIKey = 2002,
  CorpusNotReady = 2003,
  FixieStatusNotOk = 2004,

  ModelOutputCouldNotBeParsedForTool = 2005,
  ModelHallucinatedTool = 2006,
}

export type ErrorBlame =
  /** An error that is expected to occur, like a network failure. */
  | 'runtime'
  /** An error that's most likely caused by the user. */
  | 'user'
  /** An error that's most likely the fault of AI.JSX itself. */
  | 'internal'
  /** An error where it's not clear who caused it. */
  | 'ambiguous';

/**
 * A generic error thrown by AI.JSX. It could be a user error, runtime error, or internal error.
 */
export class AIJSXError extends Error {
  constructor(
    message: string,
    public readonly code: ErrorCode,
    public readonly blame: ErrorBlame,
    public readonly metadata: Jsonifiable = {}
  ) {
    super(message);
  }

  private messageOfErrorKind() {
    switch (this.blame) {
      case 'runtime':
        return "This is a runtime error that's expected to occur with some frequency. It may go away on retry. It may be made more likely by errors in your code, or in AI.JSX.";
      case 'user':
        return 'This may be due to a mistake in your code.';
      case 'internal':
        return 'This is most likely a bug in AI.JSX. Bug reports appreciated. :)';
      case 'ambiguous':
        return "It's unclear whether this was caused by a bug in AI.JSX, in your code, or is an expected runtime error.";
    }
  }

  private formattedMessage() {
    return _.last(this.message) === '.' ? this.message : `${this.message}.`;
  }

  toString() {
    return `AI.JSX(${this.code}): ${this.formattedMessage()}

${this.messageOfErrorKind()}
    
Need help? 
* Discord: https://discord.com/channels/1065011484125569147/1121125525142904862
* Docs: https://docs.ai-jsx.com/
* GH: https://github.com/fixie-ai/ai-jsx/issues`;
  }
}

/**
 * Represents an error that occurs while invoking an HTTP request to a Large Language Model.
 */
export class HttpError extends AIJSXError {
  constructor(
    message: string,
    readonly statusCode: number,
    readonly errorCode: number,
    readonly responseBody?: string,
    readonly responseHeaders?: Record<string, string>
  ) {
    super(message || `HTTP request failed with status code ${statusCode}`, errorCode, 'runtime');
  }
}
