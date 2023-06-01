import { v4 as uuidv4 } from 'uuid';
import _ from 'lodash';
import prettyMs from 'pretty-ms';
import { findUpSync } from 'find-up';
import { loadJsonFileSync } from 'load-json-file';
import { pino } from 'pino';
import pinoPretty from 'pino-pretty';
import fs from 'node:fs';
import { ModelResponse, OpenAIChatParams, OpenAICompletionParams } from './models.ts';
import { WandBObserver } from './wandb.ts';
import { TypedEmitter } from 'tiny-typed-emitter';
import { DocumentLoader } from 'langchain/document_loaders/base';
import { LangChainTextSplitter } from './langchain-wrapper.ts';
import { Document } from './docs.ts';
import { TextSplitterChunkHeaderOptions } from 'langchain/text_splitter';

export const getLogName = _.once(() => {
  const packageJsonPath = findUpSync(process.cwd());
  if (!packageJsonPath) {
    return 'llmx';
  }
  const packageJson = loadJsonFileSync(packageJsonPath) as { name: string };
  return packageJson.name || 'llmx';
});

export type LogMetadata = {
  level?: pino.Level;
} & Record<string, unknown>;

export type LogPhaseMetadata = { phase: string } & LogMetadata;
export type PhaseFunction<Result, ExtraData extends Record<string, unknown> = Record<string, unknown>> = (
  logProgress: (metadata: Record<string, unknown>, label?: string) => void,
  setAdditionalLogData: (extraDataToSet: ExtraData) => void
) => Promise<Result>;

interface PinoMessage {
  level: number;
  ts: number;
}

export interface BaseAIJSXLog extends PinoMessage {
  lifetimeId: string;
}

export interface PhaseStart {
  start: true;
}
export interface PhaseEnd extends DurationStats {
  end: true;
}

export interface ModelPhaseStartLog extends BaseAIJSXLog, PhaseStart {
  phase: 'modelCall';
  callName: string;
  params: OpenAIChatParams | OpenAICompletionParams;
  callId: ReturnType<typeof uuidv4>;
}

export type ModelPhaseStartLogInputs = Pick<ModelPhaseStartLog, 'callName' | 'params'>;

export type ModelPhaseEndLog = Omit<ModelPhaseStartLog, 'start'> &
  PhaseEnd & {
    modelResponse: ModelResponse;
  };

export type AIJSXLog = ModelPhaseStartLog | ModelPhaseEndLog | BaseAIJSXLog | PinoMessage;

interface LogEventMap {
  message: (logLine: AIJSXLog) => void;
  'model-call-start': (logLine: ModelPhaseStartLog) => void;
  'model-call-end': (logLine: ModelPhaseEndLog) => void;
}

class LogEventEmitter extends TypedEmitter<LogEventMap> {}

export interface DurationStats {
  durationMs: number;
  prettyDuration: string;
  startTimeMs: number;
  /* for the end time, just use the `ts` field on the log message */
}

export class Log {
  private wandbObserver?: WandBObserver;
  // I hope the practice of sharing an event emitter instance doesn't cause problems with events being emitted
  // multiple times.
  private eventEmitter;
  public on: LogEventEmitter['on'];
  public off: LogEventEmitter['on'];

  private constructor(private readonly pinoLog: pino.Logger, eventEmitter: LogEventEmitter) {
    this.eventEmitter = eventEmitter;
    this.on = this.eventEmitter.on.bind(this.eventEmitter);
    this.off = this.eventEmitter.off.bind(this.eventEmitter);
  }

  static create(
    opts: {
      fileLevel: pino.LevelWithSilent;
      stdoutLevel: pino.LevelWithSilent;
    },
    pinoOptions: Omit<Parameters<typeof pino>[0], 'transports'> = {}
  ) {
    const optionsWithDefaults: Parameters<typeof pino>[0] = {
      name: getLogName(),
      level: 'trace',
      ...pinoOptions,
    };
    // @ts-expect-error
    const pinoStream = pinoPretty();
    pinoStream.pipe(process.stdout);
    const pinoFile = fs.createWriteStream('llmx.log', { flags: 'w+' });
    const fakePino = pino();
    const log = new this(
      pino(optionsWithDefaults, {
        /**
         * Ideally, we would use Pino transports for everything. However, if we want to give the user the ability
         * to observe the log stream, I don't think transports are an option. If you write a custom transport, it has
         * to be in a separate thread, and I don't want to expose that complexity to users. And there doesn't appear to
         * be any way to have both a transport and this destination object.
         *
         * So we reimplement the console and file writing logic ourselves.
         */
        write(msgStr) {
          const message = JSON.parse(msgStr) as AIJSXLog;
          /**
           * Ideally, we'd use the present Pino instance to look up `levels.` However, because we're passing this value
           * into Pino in the constructor, we don't have the instance to use. So we construct a fake instance and use
           * that, which works as long as no one sets custom levels on this instance.
           *
           * Alternative: capture a reference to the Pino instance in the closure, then use it here. That'll work as
           * long as pino doesn't call this method before the constructor returns.
           */
          if (message.level >= fakePino.levels.values[opts.stdoutLevel]) {
            // For some reason this is double-logging - maybe I put an extra console.log in node_modules?
            pinoStream.write(msgStr);
          }

          if (message.level >= fakePino.levels.values[opts.fileLevel]) {
            pinoFile.write(msgStr);
          }

          /**
           * The event emitter is shared between all instances, so if you call the pub/sub methods on a child, you'll
           * see all events globally, not just those pertaining to the child.
           *
           * This might be counter-intuitive in some specific cases, but I think most of the time, it'll do what people
           * want by default. Also, if we wanted to implement child-specific events, we'd need event-bubbling logic /
           * to think more about what those semantics look like, which I don't want to do.
           *
           * The point of creating a child logger is a curry for metadata. It's not a way to get more focused events.
           */

          log.eventEmitter.emit('message', message);

          /**
           * Rather than have privileged events emitted at particular points, the logger should drive everything off
           * the log stream. This will make the types ultimately simpler and force consistency, because there's no risk of
           * the prvileged events being subtly different from the log stream.
           *
           * However, we will emit events, driven by the log stream, under particular names, so devs don't always need to
           * listen for all events and filter them.
           */
          if ('phase' in message) {
            if ('start' in message) {
              log.eventEmitter.emit('model-call-start', message);
              return;
            }
            // This `'end' in` check should be unnecessary, but TS isn't type narrowing as well as it could.
            if ('end' in message) {
              log.eventEmitter.emit('model-call-end', message);
            }
          }
        },
      }),
      new LogEventEmitter()
    );
    return log;
  }

  child(...opts: Parameters<pino.Logger['child']>) {
    const child = new Log(this.pinoLog.child(...opts), this.eventEmitter);
    child.eventEmitter = this.eventEmitter;
    return child;
  }

  // Maybe we should be using https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Proxy here.
  fatal = (obj: unknown | string, msg?: string) => this.pinoLog.fatal(obj, msg);
  error = (obj: unknown | string, msg?: string) => this.pinoLog.error(obj, msg);
  warn = (obj: unknown | string, msg?: string) => this.pinoLog.warn(obj, msg);
  info = (obj: unknown | string, msg?: string) => this.pinoLog.info(obj, msg);
  debug = (obj: unknown | string, msg?: string) => this.pinoLog.debug(obj, msg);
  trace = (obj: unknown | string, msg?: string) => this.pinoLog.trace(obj, msg);

  // TODO: if the fn throws, the end state will never be logged.
  async logPhase<
    Result,
    Input extends LogPhaseMetadata = LogPhaseMetadata,
    ExtraDataToSet extends Record<string, unknown> = Record<string, unknown>
  >(logOpts: Input, fn: PhaseFunction<Result, ExtraDataToSet>) {
    const logOptsWithoutMetadata = _.omit(logOpts, 'level');
    const { phase, level = 'info' } = logOpts;
    const childLog = this.child(logOptsWithoutMetadata);
    childLog[level]({ start: true }, `Starting ${phase}`);

    const startTime = new Date();

    function getDurationStats(): DurationStats {
      const endTime = new Date(),
        durationMs = endTime.valueOf() - startTime.valueOf();

      return { durationMs, prettyDuration: prettyMs(durationMs), startTimeMs: startTime.valueOf() };
    }

    // It might be nice if the setAdditionalLogData function passed to the phase function were resilient to errors.
    // Right now, if it throws an error, the final logger call never occurs.
    // It could be nice to attach the logging metadata, log the last line, and then throw the error.
    // Or give a way for the logProgress function to do a "log then throw" pattern.

    function logProgress(logOpts: Record<string, unknown>) {
      childLog[level]({ ...logOpts, ...getDurationStats() }, `In progress: ${phase}`);
    }

    let logOptsAdditions: Record<string, unknown> | undefined;
    const returnVal = await fn(logProgress, (additionalLogData) => {
      logOptsAdditions = additionalLogData;
    });

    const durationStats = getDurationStats();
    childLog[level]({ ...logOptsAdditions, ...durationStats, end: true }, `Completed ${phase}`);
    return returnVal;
  }

  docLoad(callFn: () => ReturnType<DocumentLoader['load']>) {
    return this.logPhase({ phase: 'docLoad', level: 'debug' }, async (_logProgress, additionalLogData) => {
      const docs = await callFn();
      additionalLogData({ outputDocs: docs });
      return docs;
    });
  }
  docLoadAndSplit(callFn: () => ReturnType<DocumentLoader['load']>) {
    return this.logPhase({ phase: 'docLoadAndSplit', level: 'debug' }, async (_logProgress, additionalLogData) => {
      const docs = await callFn();
      additionalLogData({ outputDocs: docs });
      return docs;
    });
  }
  splitDocs(docs: Document[], callFn: () => ReturnType<LangChainTextSplitter['splitDocuments']>) {
    return this.logPhase(
      { phase: 'docSplit', level: 'debug', inputDocs: docs },
      async (_logProgress, additionalLogData) => {
        const docs = await callFn();
        additionalLogData({ outputDocs: docs });
        return docs;
      }
    );
  }
  createDocs(
    texts: string[],
    metadatas: Record<string, any>[] | undefined,
    chunkHeaderOptions: TextSplitterChunkHeaderOptions | undefined,
    callFn: () => ReturnType<LangChainTextSplitter['createDocuments']>
  ) {
    return this.logPhase(
      { phase: 'docCreate', level: 'debug', texts, metadatas, chunkHeaderOptions },
      async (_logProgress, additionalLogData) => {
        const docs = await callFn();
        additionalLogData({ outputDocs: docs });
        return docs;
      }
    );
  }

  modelCall<Result extends ModelResponse>(callOpts: ModelPhaseStartLogInputs, callFn: () => Promise<Result>) {
    const callId = uuidv4();
    const modelCallMetadata = {
      callId,
      ...callOpts,
    };
    const logOpts = {
      ...modelCallMetadata,
      phase: 'modelCall',
      level: 'debug',
    } as const;
    return this.logPhase<ModelResponse, typeof logOpts, { modelResponse: ModelResponse }>(
      logOpts,
      async (_logProgress, additionalLogData) => {
        const modelResponse = await callFn();
        additionalLogData({ modelResponse });
        return modelResponse;
      }
    );
  }

  async *logGeneratorDuration<T, TReturn>(logOpts: LogPhaseMetadata, generator: AsyncGenerator<T, TReturn, void>) {
    const startTime = new Date();
    const logOptsWithoutMetadata = _.omit(logOpts, 'level');
    const { phase, level = 'info' } = logOpts;
    const childLog = this.child(logOptsWithoutMetadata);
    childLog[level]({}, `Starting generator ${phase}`);

    function getDurationStats() {
      const endTime = new Date(),
        durationMs = endTime.valueOf() - startTime.valueOf();

      return { durationMs, prettyDuration: prettyMs(durationMs) };
    }

    for await (const val of generator) {
      childLog[level]({ emittedValue: val }, 'emitted');
      yield val;
    }

    childLog[level]({ ...getDurationStats() }, `Completed generator ${phase}`);
  }

  enableWandB() {
    this.wandbObserver = new WandBObserver();
    return this.wandbObserver.beginRun(this);
  }
  disableWandB() {
    this.wandbObserver?.endRun();
  }
}

const log = Log.create({
  fileLevel: 'trace',
  stdoutLevel: (process.env.loglevel as pino.LevelWithSilent | undefined) ?? 'silent',
}).child({
  lifetimeId: uuidv4(),
});

export default log;
