import type { HealthResponse } from '@euclid/contracts';
import { createLogger } from '@euclid/log';
import { startTelemetry } from '@euclid/log/telemetry';
import { serve } from '@hono/node-server';
import { SpanStatusCode, trace } from '@opentelemetry/api';
import { Hono } from 'hono';
import { pool } from '../db/client';

const telemetry = startTelemetry('euclid-api');
const logger = createLogger('euclid-api');
const tracer = trace.getTracer('euclid-api');
const app = new Hono();
app.get('/api/health', (c) =>
  tracer.startActiveSpan('health.check', async (span) => {
    try {
      await pool.query('SELECT 1');
      return c.json({
        status: 'ok',
        database: 'connected',
      } satisfies HealthResponse);
    } catch (error) {
      logger.error({ err: error }, 'Database health check failed');
      span.setStatus({
        code: SpanStatusCode.ERROR,
        message: 'Database unavailable',
      });
      return c.json(
        {
          status: 'unavailable',
          database: 'unavailable',
        } satisfies HealthResponse,
        503,
      );
    } finally {
      span.end();
    }
  }),
);
const server = serve(
  {
    fetch: app.fetch,
    port: Number(process.env.PORT ?? 3000),
    hostname: '0.0.0.0',
  },
  (info) => logger.info({ port: info.port }, 'API listening'),
);
async function shutdown() {
  server.close();
  await pool.end();
  await telemetry.shutdown();
}
process.once('SIGTERM', () => void shutdown());
process.once('SIGINT', () => void shutdown());
