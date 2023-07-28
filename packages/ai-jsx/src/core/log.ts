/**
 * This module provides logging functions.
 * @packageDocumentation
 */

import _ from 'lodash';
import pino from 'pino';
import { Element } from './node.js';

export type LogLevel = 'fatal' | 'error' | 'warn' | 'info' | 'debug' | 'trace';

/**
 * A Logger represents an object that can log messages.
 */
export type Logger = Record<LogLevel, (obj: object | string, msg?: string) => void>;

/**
 * An abstract class that represents an implementation of {@link Logger}.
 */
export abstract class LogImplementation {
  protected readonly loggedExceptions = new WeakMap<object, boolean>();

  /**
   * @param level The logging level.
   * @param element The element from which the log originated.
   * @param renderId A unique identifier associated with the rendering request for this element.
   * @param metadataOrMessage An object to be included in the log, or a message to log.
   * @param message The message to log, if `metadataOrMessage` is an object.
   */
  abstract log(
    level: LogLevel,
    element: Element<any>,
    renderId: string,
    metadataOrMessage: object | string,
    message?: string
  ): void;

  /**
   * Logs exceptions thrown during an element's render. By default invokes `log` with level `"error"`
   * for the element that threw the exception and level `"trace"` for elements through which the exception
   * propagated. This will not be invoked for `ErrorBoundary` components that handle errors from their children.
   *
   * @param element The element from which the exception originated or through which the exception was propagated.
   * @param renderId A unique identifier associated with the rendering request for this element.
   * @param exception The thrown exception.
   */
  logException(element: Element<object>, renderId: string, exception: unknown) {
    let alreadyLoggedException = false;
    if (typeof exception === 'object' && exception !== null) {
      alreadyLoggedException = this.loggedExceptions.has(exception);
      if (!alreadyLoggedException) {
        this.loggedExceptions.set(exception, true);
      }
    }

    const elementTag = `<${element.tag.name}>`;
    this.log(
      alreadyLoggedException ? 'trace' : 'error',
      element,
      renderId,
      { exception },
      `Rendering element ${elementTag} failed with exception: ${exception}`
    );
  }
}

/**
 * An implementation of {@link LogImplementation} that does nothing.
 */
export class NoOpLogImplementation extends LogImplementation {
  log(): void {}
}

const defaultPinoLogger = _.once(() => {
  const logEnv = process.env.AIJSX_LOG ?? 'silent';
  const [level, file] = logEnv.split(':', 2);
  // @ts-expect-error
  return pino({ name: 'ai-jsx', level }, file && pino.destination(file));
});

/**
 * An implementation of {@link LogImplementation} that uses the `pino` logging library.
 */
export class PinoLogger extends LogImplementation {
  constructor(private readonly pino: pino.Logger = defaultPinoLogger()) {
    super();
  }

  log(
    level: LogLevel,
    element: Element<object>,
    renderId: string,
    metadataOrMessage: string | object,
    message?: string | undefined
  ): void {
    const [objectToLog, messageToLog] =
      typeof metadataOrMessage === 'object' ? [metadataOrMessage, message] : [{}, metadataOrMessage];
    this.pino[level]({ ...objectToLog, renderId, element: `<${element.tag.name}>` }, messageToLog);
  }
}

/**
 * A BoundLogger binds a {@link LogImplementation} to a specific render of an Element.
 */
export class BoundLogger implements Logger {
  constructor(
    private readonly impl: LogImplementation,
    private readonly renderId: string,
    private readonly element: Element<any>
  ) {}

  fatal = (obj: object | string, msg?: string) => this.impl.log('fatal', this.element, this.renderId, obj, msg);
  error = (obj: object | string, msg?: string) => this.impl.log('error', this.element, this.renderId, obj, msg);
  warn = (obj: object | string, msg?: string) => this.impl.log('warn', this.element, this.renderId, obj, msg);
  info = (obj: object | string, msg?: string) => this.impl.log('info', this.element, this.renderId, obj, msg);
  debug = (obj: object | string, msg?: string) => this.impl.log('debug', this.element, this.renderId, obj, msg);
  trace = (obj: object | string, msg?: string) => this.impl.log('trace', this.element, this.renderId, obj, msg);
}
