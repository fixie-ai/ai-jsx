import { Jsonifiable } from 'type-fest';

export type ErrorKind =
  /** An error that is expected to occur, like a network failure. */
  | 'runtime'
  /** An error that's most likely caused by the user. */
  | 'user'
  /** An error that's most likely the fault of AI.JSX itself. */
  | 'internal';

/**
 * A generic error thrown by AI.JSX. It could be a user error, runtime error, or internal error.
 */
export class AIJSXError extends Error {
  constructor(
    message: string,
    public readonly code: number,
    public readonly kind: ErrorKind,
    public readonly metadata: Jsonifiable = {}
  ) {
    super(message);
  }

  private messageOfErrorKind() {
    switch (this.kind) {
      case 'runtime':
        return "This is a runtime error that's expected to occur with some frequency. It may go away on retry. It may be made more likely by errors in your code, or in AI.JSX.";
      case 'user':
        return 'This may be due to a mistake in your code.';
      case 'internal':
        return 'This is most likely a bug in AI.JSX. Bug reports appreciated. :)';
    }
  }

  toString() {
    return `AI.JSX(${this.code}): ${this.message}.

${this.messageOfErrorKind()}
    
Need help? 
* Discord: https://discord.com/channels/1065011484125569147/1121125525142904862
* Docs: https://docs.ai-jsx.com/
* GH: https://github.com/fixie-ai/ai-jsx/issues`;
  }
}
