import { strict as assert } from 'node:assert';
import { trace } from '@opentelemetry/api';
import { SeverityNumber } from '@opentelemetry/api-logs';
import {
  InMemoryLogRecordExporter,
  SimpleLogRecordProcessor,
} from '@opentelemetry/sdk-logs';
import { NodeSDK, tracing } from '@opentelemetry/sdk-node';
import { createLogger } from './index';

async function run() {
  const exporter = new InMemoryLogRecordExporter();
  const processor = new SimpleLogRecordProcessor(exporter);
  const sdk = new NodeSDK({
    traceExporter: new tracing.InMemorySpanExporter(),
    logRecordProcessors: [processor],
    serviceName: 'test-service',
  });
  sdk.start();
  const logger = createLogger('test-service');
  trace.getTracer('test').startActiveSpan('operation', (span) => {
    logger.error(
      { err: new Error('failed'), requestId: 'request-1' },
      'operation failed',
    );
    span.end();
  });
  await processor.forceFlush();
  const [record] = exporter.getFinishedLogRecords();
  assert.equal(record.body, 'operation failed');
  assert.equal(record.severityNumber, SeverityNumber.ERROR);
  assert.equal(record.attributes.requestId, 'request-1');
  assert.match(String(record.attributes.err), /failed/);
  assert.equal(record.spanContext?.traceId, record.attributes.trace_id);
  assert.equal(record.spanContext?.spanId, record.attributes.span_id);
  await sdk.shutdown();
}
await run();
