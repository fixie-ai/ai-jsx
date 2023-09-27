import { NodeSDK } from '@opentelemetry/sdk-node';
import { HttpInstrumentation } from '@opentelemetry/instrumentation-http';
import fastify_instrumentation from '@opentelemetry/instrumentation-fastify';
import { FetchInstrumentation } from '@opentelemetry/instrumentation-fetch';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-grpc';
import { OTLPLogExporter } from '@opentelemetry/exporter-logs-otlp-grpc';
import { BatchLogRecordProcessor } from '@opentelemetry/sdk-logs';

function escapeRegExp(value: string) {
  // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Regular_Expressions#escaping
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); // $& means the whole matched string
}

const fixieApiUrl = process.env.FIXIE_API_URL ?? 'https://api.fixie.ai';
const fixieApiUrlWithSlash = fixieApiUrl.endsWith('/') ? fixieApiUrl : `${fixieApiUrl}/`;
const fixieApiUrlRegex = new RegExp(`${escapeRegExp(fixieApiUrlWithSlash)}.*`);

const sdk = new NodeSDK({
  traceExporter: new OTLPTraceExporter(),
  logRecordProcessor: new BatchLogRecordProcessor(new OTLPLogExporter()),
  instrumentations: [
    new HttpInstrumentation(),
    new fastify_instrumentation.FastifyInstrumentation(),
    new FetchInstrumentation({
      propagateTraceHeaderCorsUrls: [fixieApiUrlRegex],
    }),
  ],
  serviceName: 'ai.jsx-fixie-agent',
});

// Add some workarounds for `FetchInstrumentation` assuming we're in the browser.
// See https://github.com/open-telemetry/opentelemetry-js/issues/3413
(globalThis as any).location = {} as any;
(globalThis as any).navigator = {} as any;

try {
  sdk.start();
} catch (error) {
  console.error(error);
}

process.on('beforeExit', async () => {
  await sdk.shutdown();
});
