import { createServer } from 'node:http';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createLogger } from '@euclid/log';
import { startTelemetry } from '@euclid/log/telemetry';
import { getRequestListener } from '@hono/node-server';
import { serveStatic } from '@hono/node-server/serve-static';
import { Hono } from 'hono';

const telemetry = startTelemetry('euclid-web');
const logger = createLogger('euclid-web');
const root = dirname(fileURLToPath(import.meta.url));
const apiUrl = process.env.API_URL ?? 'http://localhost:3000';
const isProduction = process.env.NODE_ENV === 'production';
const app = new Hono();

app.all('/api/*', async (c) => {
  const requestUrl = new URL(c.req.url);

  try {
    const upstreamUrl = new URL(
      requestUrl.pathname + requestUrl.search,
      apiUrl,
    );
    return await fetch(new Request(upstreamUrl, c.req.raw));
  } catch (error) {
    logger.error({ err: error }, 'API proxy request failed');
    return c.json({ status: 'unavailable' }, 502);
  }
});

if (isProduction) {
  app.use(
    '*',
    serveStatic({
      root: resolve(root, 'dist'),
      rewriteRequestPath: (path) => (path === '/' ? '/index.html' : path),
    }),
  );
}

const listener = getRequestListener(app.fetch);
let vite: import('vite').ViteDevServer | undefined;
const server = createServer((req, res) => {
  if (req.url?.startsWith('/api/') || !vite) {
    return listener(req, res);
  }
  vite.middlewares(req, res, () => listener(req, res));
});

if (!isProduction) {
  const { createServer: createViteServer } = await import('vite');
  vite = await createViteServer({
    configFile: resolve(root, 'vite.config.ts'),
    server: { middlewareMode: true, hmr: { server } },
  });
}

server.listen(Number(process.env.PORT ?? 8080), '0.0.0.0', () =>
  logger.info({ port: Number(process.env.PORT ?? 8080) }, 'Web listening'),
);

async function shutdown() {
  server.close();
  await vite?.close();
  await telemetry.shutdown();
}

process.once('SIGTERM', () => void shutdown());
process.once('SIGINT', () => void shutdown());
