import type { Context, Next } from 'hono';
import { logger } from '../observability/logger.js';

export async function corsMiddleware(context: Context, next: Next): Promise<Response | undefined> {
  context.header('Access-Control-Allow-Origin', '*');
  context.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  context.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (context.req.method === 'OPTIONS') {
    return context.body(null, 204);
  }

  await next();
  return undefined;
}

export async function requestLogger(context: Context, next: Next): Promise<void> {
  const startedAt = performance.now();
  await next();

  const durationMs = Math.round(performance.now() - startedAt);
  const method = context.req.method;
  const status = context.res.status;
  const path = context.req.path;
  const shouldLog =
    status >= 400 ||
    durationMs >= 1000 ||
    !['GET', 'HEAD', 'OPTIONS'].includes(method);

  if (!shouldLog) {
    return;
  }

  const log = status >= 500 ? logger.error : status >= 400 ? logger.warn : logger.info;
  log('HTTP', {
    durationMs,
    method,
    path,
    status,
  });
}
