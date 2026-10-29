import { context, isSpanContextValid, trace } from '@opentelemetry/api';
import { logs, SeverityNumber } from '@opentelemetry/api-logs';
import pino from 'pino';

const severities: Record<number, SeverityNumber> = {
  10: SeverityNumber.TRACE,
  20: SeverityNumber.DEBUG,
  30: SeverityNumber.INFO,
  40: SeverityNumber.WARN,
  50: SeverityNumber.ERROR,
  60: SeverityNumber.FATAL,
};

/** Structured JSON on stdout and the same records through the active OTel SDK. */
export function createLogger(service: string) {
  const otel = logs.getLogger('@euclid/log');
  return pino(
    {
      level: process.env.LOG_LEVEL ?? 'info',
      base: { service },
      timestamp: pino.stdTimeFunctions.isoTime,
      mixin() {
        const span = trace.getSpanContext(context.active());
        return span && isSpanContextValid(span)
          ? {
              trace_id: span.traceId,
              span_id: span.spanId,
              trace_flags: span.traceFlags.toString(16).padStart(2, '0'),
            }
          : {};
      },
    },
    {
      write(line: string) {
        process.stdout.write(line);
        const record = JSON.parse(line);
        const { level, time, msg, ...fields } = record;
        // OTel attributes are scalar or homogeneous arrays; preserve structured fields as JSON.
        const attributes = Object.fromEntries(
          Object.entries(fields).map(([key, value]) => [
            key,
            typeof value === 'string' ||
            typeof value === 'number' ||
            typeof value === 'boolean'
              ? value
              : (JSON.stringify(value) ?? 'null'),
          ]),
        );
        otel.emit({
          timestamp: new Date(time),
          severityNumber: severities[level] ?? SeverityNumber.UNSPECIFIED,
          severityText: pino.levels.labels[level]?.toUpperCase(),
          body: msg,
          attributes,
        });
      },
    },
  );
}
