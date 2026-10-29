import { OTLPLogExporter } from '@opentelemetry/exporter-logs-otlp-proto';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-proto';
import { BatchLogRecordProcessor } from '@opentelemetry/sdk-logs';
import { NodeSDK } from '@opentelemetry/sdk-node';

export function startTelemetry(serviceName: string) {
  const sdk = new NodeSDK({
    serviceName,
    traceExporter: new OTLPTraceExporter({
      url:
        process.env.OTEL_EXPORTER_OTLP_TRACES_ENDPOINT ??
        'http://phoenix:6006/v1/traces',
      headers: process.env.PHOENIX_API_KEY
        ? { Authorization: `Bearer ${process.env.PHOENIX_API_KEY}` }
        : {},
    }),
    logRecordProcessors: [new BatchLogRecordProcessor(new OTLPLogExporter())],
  });
  sdk.start();
  return sdk;
}
