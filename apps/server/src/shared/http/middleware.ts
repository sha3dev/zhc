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

  logger.info('HTTP request handled', {
    durationMs: Math.round(performance.now() - startedAt),
    method: context.req.method,
    path: context.req.path,
    status: context.res.status,
  });
}
