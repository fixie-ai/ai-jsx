export class HttpError extends Error {
  constructor(
    message: string,
    readonly statusCode: number,
    readonly responseBody?: string,
    readonly responseHeaders?: Record<string, string>
  ) {
    super(message || `HTTP request failed with status code ${statusCode}`);
  }
}
