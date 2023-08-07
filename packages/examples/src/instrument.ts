import { NodeSDK } from '@opentelemetry/sdk-node';
import { FetchInstrumentation } from '@opentelemetry/instrumentation-fetch';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-grpc';
import { OTLPLogExporter } from '@opentelemetry/exporter-logs-otlp-grpc';
import { BatchLogRecordProcessor } from '@opentelemetry/sdk-logs';

process.env.AIJSX_ENABLE_OPENTELEMETRY = '1';

const sdk = new NodeSDK({
  traceExporter: new OTLPTraceExporter(),
  logRecordProcessor: new BatchLogRecordProcessor(new OTLPLogExporter()),
  instrumentations: [new FetchInstrumentation()],
  serviceName: 'ai.jsx-demo',
});

// Add some workarounds for `FetchInstrumentation` assuming we're in the browser.
(globalThis as any).location = {} as any;
(globalThis as any).navigator = {} as any;

try {
  sdk.start();
} catch (error) {
  console.error(error);
}

process.on('exit', () => {
  sdk.shutdown();
});
