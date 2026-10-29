import { createLogger } from '@euclid/log';
import { startTelemetry } from '@euclid/log/telemetry';
import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import { PgBoss } from 'pg-boss';

const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error('DATABASE_URL is required');
const telemetry = startTelemetry('euclid-worker');
const logger = createLogger('euclid-worker');
const boss = new PgBoss(connectionString);
boss.on('error', (error) => logger.error({ err: error }, 'pg-boss error'));
await boss.start();
// Register domain queues and handlers here when the first pipeline is designed.
const app = new Hono();
app.get('/health', (c) => c.json({ status: 'ok' }));
const server = serve(
  {
    fetch: app.fetch,
    port: Number(process.env.PORT ?? 3001),
    hostname: '0.0.0.0',
  },
  (info) => logger.info({ port: info.port }, 'Worker listening'),
);
async function shutdown() {
  server.close();
  await boss.stop({ graceful: true });
  await telemetry.shutdown();
}
process.once('SIGTERM', () => void shutdown());
process.once('SIGINT', () => void shutdown());
