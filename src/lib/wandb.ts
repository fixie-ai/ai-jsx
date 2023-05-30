import { ensureProcessEnvVar } from './util';
import { InternalApi, SpanKind, StatusCode, WBTraceTree } from '@nick.heiner/wandb-fork';
import { FsFilesData, FsFinishedData } from '@nick.heiner/wandb-fork/dist/internal/filestream';
import { Log, ModelPhaseEndLog, getLogName } from './log';
import got from 'got';
import { PromiseType } from 'utility-types';

/**
 * This is pretty hacky.
 *
 * https://github.com/wandb/wandb-js/issues/10
 */
export class WandBObserver {
  private readonly apiKey: string;
  private readonly wandbApi: InternalApi;
  private viewer?: PromiseType<ReturnType<InternalApi['viewer']>>;
  private run?: PromiseType<ReturnType<InternalApi['upsertRun']>>;
  private log?: Log;
  private modelCallsInThisRun = 0;

  constructor() {
    this.apiKey = ensureProcessEnvVar('WANDB_API_KEY');
    this.wandbApi = new InternalApi('https://api.wandb.ai', this.apiKey);

    this.onModelCallEnd = this.onModelCallEnd.bind(this);
  }

  async beginRun(log: Log) {
    if (this.viewer || this.run || this.log) {
      throw new Error('Run already started');
    }

    this.viewer = await this.wandbApi.viewer();
    this.run = await this.wandbApi.upsertRun({
      project: getLogName(),
    });
    this.log = log.child({ module: 'wandb' });

    log.info(
      {
        uiUrl: `https://wandb.ai/${this.viewer.viewer?.entity}/${this.run.upsertBucket?.bucket?.project?.name}/runs/${this.run.upsertBucket?.bucket?.name}`,
      },
      'Streaming results to Weights and Biases'
    );

    this.log.on('model-call-end', this.onModelCallEnd);
  }

  /**
   * This gets the right values, and it creates a separate trace in wandb for each call, but each trace is just the
   * by the first received value.
   *
   * I think I need to do something different with the offset fields?
   */
  private onModelCallEnd(modelCallStats: ModelPhaseEndLog) {
    const traceTree = new WBTraceTree({
      span_id: modelCallStats.callId,
      name: modelCallStats.callName,
      start_time_ms: modelCallStats.startTimeMs,
      end_time_ms: modelCallStats.ts,
      status_code: StatusCode.SUCCESS,
      attributes: {},
      results: [
        {
          inputs: modelCallStats.params,
          // I think this is ok. I think wandb just wanted `Jsonifiable` here.
          // @ts-expect-error
          outputs: modelCallStats.modelResponse,
        },
      ],
      child_spans: [],
      span_kind: SpanKind.LLM,
    });
    // The trace timeline etc isn't right.
    const trace = {
      langchain_trace: traceTree.toJSON(),
      // If you increment the `step` here, it will show up as a new Trace in the wandb UI.
      _step: this.modelCallsInThisRun++,
      _runtime: modelCallStats.durationMs / 1000,
      _timestamp: new Date().valueOf(),
    };
    this.updateRun({
      files: {
        'wandb-history.jsonl': {
          offset: 0,
          content: [JSON.stringify(trace)],
        },
        'wandb-summary.json': {
          offset: 0,
          content: [JSON.stringify(trace)],
        },
      },
    });
  }

  private updateRun(fileData: FsFilesData | FsFinishedData) {
    if (!this.viewer || !this.run) {
      throw new Error('Run not started');
    }

    this.log?.debug({ fileData }, 'Updating run with file data');

    const url = `https://api.wandb.ai/files/${this.viewer.viewer?.entity}/${this.run.upsertBucket?.bucket?.project?.name}/${this.run.upsertBucket?.bucket?.name}/file_stream`;
    const auth = `Basic ${Buffer.from(`api:${this.apiKey}`).toString('base64')}`;
    return got.post(url, {
      method: 'POST',
      body: JSON.stringify(fileData),
      headers: {
        'User-Agent': 'Fixie AI',
        'Content-Type': 'application/json',
        Authorization: auth,
      },
    });
  }

  async endRun() {
    if (!(this.viewer || this.run || this.log)) {
      throw new Error('Run not started');
    }

    this.updateRun({
      complete: true,
      exitcode: 0,
    });
    this.log?.off('model-call-end', this.onModelCallEnd);

    this.viewer = undefined;
    this.run = undefined;
    this.log = undefined;
    this.modelCallsInThisRun = 0;
  }
}
