import { AIJSXError } from "../lib/error.js";

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
