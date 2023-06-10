import _ from 'lodash';
import { pino } from 'pino';
import { Element } from '../index';
import { v4 as uuidv4 } from 'uuid';

export type LogLevel = 'fatal' | 'error' | 'warn' | 'info' | 'debug' | 'trace';

export type Logger = Record<LogLevel, (obj: object | string, msg?: string) => void>;

/**
 * @param level The logging level.
 * @param element The element from which the log originated.
 * @param renderId A unique identifier associated with the rendering request.
 * @param metadataOrMessage An object to be included in the log, or a message to log.
 * @param message The message to log, if `metadataOrMessage` is an object.
 */
export type LogImplementation = (
  level: LogLevel,
  element: Element<any>,
  renderId: string,
  metadataOrMessage: object | string,
  message?: string
) => void;

const defaultPinoLogger = _.once(() =>
  pino(
    { name: 'ai-jsx', level: 'trace' },
    pino.destination({
      dest: './ai-jsx.log',
      sync: true, // Synchronous logging
    })
  )
);

/**
 * Creates a pino-based `LogImplementation`.
 * @param pinoLogger The optional pino logger to use.
 * @returns A `LogImplementation`.
 */
export function pinoLogger(pinoLogger?: pino.Logger): LogImplementation {
  const definedPinoLogger = pinoLogger ?? defaultPinoLogger();

  return (level, element, renderId, obj, msg?) => {
    const [objectToLog, messageToLog] = typeof obj === 'object' ? [obj, msg] : [{}, obj];
    definedPinoLogger[level]({ ...objectToLog, renderId, element: `<${element.tag.name}>` }, messageToLog);
  };
}

/**
 * Binds a LogImplementation to a specific render of an `Element`.
 */
export class BoundLogger implements Logger {
  private readonly renderId;

  constructor(private readonly impl: LogImplementation, private readonly element: Element<any>) {
    this.renderId = uuidv4();
    this.element = element;
  }

  fatal = (obj: object | string, msg?: string) => this.impl('fatal', this.element, this.renderId, obj, msg);
  error = (obj: object | string, msg?: string) => this.impl('error', this.element, this.renderId, obj, msg);
  warn = (obj: object | string, msg?: string) => this.impl('warn', this.element, this.renderId, obj, msg);
  info = (obj: object | string, msg?: string) => this.impl('info', this.element, this.renderId, obj, msg);
  debug = (obj: object | string, msg?: string) => this.impl('debug', this.element, this.renderId, obj, msg);
  trace = (obj: object | string, msg?: string) => this.impl('trace', this.element, this.renderId, obj, msg);
}
