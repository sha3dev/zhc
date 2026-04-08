import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { serve } from '@hono/node-server';
import { serveStatic } from '@hono/node-server/serve-static';
import { createAppContext } from '../../app/context.js';
import { createHttpApp } from '../../app/http-app.js';
import { env } from '../../shared/config/env.js';
import { logger } from '../../shared/observability/logger.js';

const webDistPath = fileURLToPath(new URL('../../../../web/dist', import.meta.url));
const context = createAppContext();

await context.bootstrap().catch((error) => {
  logger.error('Failed to bootstrap default agents', { error: String(error) });
});

const app = createHttpApp(context);

app.use('/assets/*', serveStatic({ root: webDistPath }));
app.get('*', async (requestContext) => {
  if (requestContext.req.path.startsWith('/api')) {
    return requestContext.notFound();
  }

  try {
    const html = await readFile(`${webDistPath}/index.html`, 'utf8');
    return requestContext.html(html);
  } catch (error) {
    logger.error('Failed to serve web application', { error: String(error), webDistPath });
    return requestContext.text('Web application build not found', 503);
  }
});

serve({
  fetch: app.fetch,
  port: env.PORT,
});
