import { readFile, stat } from 'node:fs/promises';
import { createServer as createHttpServer } from 'node:http';
import { extname, join, normalize, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { getRequestListener } from '@hono/node-server';
import type { Connect, ViteDevServer } from 'vite';
import { createAppContext } from '../../app/context.js';
import { createHttpApp } from '../../app/http-app.js';
import { env } from '../../shared/config/env.js';
import { logger } from '../../shared/observability/logger.js';

const webRootPath = fileURLToPath(new URL('../../../../web', import.meta.url));
const webDistPath = join(webRootPath, 'dist');
const webIndexPath = join(webRootPath, 'index.html');
const isDevelopment = env.NODE_ENV === 'development';
const context = createAppContext();

await context.bootstrap().catch((error) => {
  logger.error('Failed to bootstrap default agents', { error: String(error) });
});

await context.emailPoller.start().catch((error) => {
  logger.error('Failed to start email poller', { error: String(error) });
});

const app = createHttpApp(context);
const apiListener = getRequestListener(app.fetch);

function getContentType(pathname: string): string {
  switch (extname(pathname)) {
    case '.css':
      return 'text/css; charset=utf-8';
    case '.html':
      return 'text/html; charset=utf-8';
    case '.js':
      return 'text/javascript; charset=utf-8';
    case '.json':
      return 'application/json; charset=utf-8';
    case '.map':
      return 'application/json; charset=utf-8';
    case '.svg':
      return 'image/svg+xml';
    default:
      return 'application/octet-stream';
  }
}

function isApiPath(pathname: string): boolean {
  return pathname === '/api' || pathname.startsWith('/api/');
}

function toDistFilePath(pathname: string): string {
  const relativePath = pathname === '/' ? 'index.html' : pathname.replace(/^\/+/, '');
  return resolve(webDistPath, normalize(relativePath));
}

async function tryServeDistAsset(
  req: Parameters<Connect.NextHandleFunction>[0],
  res: Parameters<Connect.NextHandleFunction>[1],
  pathname: string,
): Promise<boolean> {
  const filePath = toDistFilePath(pathname);

  if (!filePath.startsWith(webDistPath)) {
    return false;
  }

  try {
    const fileStat = await stat(filePath);
    if (!fileStat.isFile()) {
      return false;
    }

    const content = await readFile(filePath);
    res.statusCode = 200;
    res.setHeader('Content-Type', getContentType(filePath));
    res.setHeader('Content-Length', Buffer.byteLength(content));
    if (req.method !== 'HEAD') {
      res.end(content);
    } else {
      res.end();
    }
    return true;
  } catch {
    return false;
  }
}

async function serveSpaIndex(
  res: Parameters<Connect.NextHandleFunction>[1],
  pathname: string,
  vite: ViteDevServer | null,
): Promise<void> {
  try {
    const template = await readFile(vite ? webIndexPath : join(webDistPath, 'index.html'), 'utf8');
    const html = vite ? await vite.transformIndexHtml(pathname, template) : template;
    res.statusCode = 200;
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.end(html);
  } catch (error) {
    logger.error('Failed to serve web application', {
      error: String(error),
      mode: vite ? 'development' : 'production',
      webDistPath,
      webIndexPath,
    });
    res.statusCode = 503;
    res.end('Web application is not available');
  }
}

async function createViteMiddleware(): Promise<ViteDevServer | null> {
  if (!isDevelopment) {
    return null;
  }

  const { createServer } = await import('vite');
  return createServer({
    appType: 'custom',
    configFile: join(webRootPath, 'vite.config.ts'),
    root: webRootPath,
    server: {
      middlewareMode: true,
      watch: {
        ignored: ['**/dist/**'],
      },
    },
  });
}

const vite = await createViteMiddleware();

const server = createHttpServer((req, res) => {
  const url = new URL(req.url ?? '/', 'http://localhost');
  const pathname = url.pathname;

  if (isApiPath(pathname)) {
    return apiListener(req, res);
  }

  if (vite) {
    return vite.middlewares(req, res, (error?: Error) => {
      if (error) {
        vite.ssrFixStacktrace(error as Error);
        logger.error('Vite middleware failed', { error: String(error), pathname });
        res.statusCode = 500;
        res.end(String(error));
        return;
      }

      if (req.method !== 'GET' && req.method !== 'HEAD') {
        res.statusCode = 404;
        res.end('Not Found');
        return;
      }

      void serveSpaIndex(res, pathname, vite);
    });
  }

  void (async () => {
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      res.statusCode = 404;
      res.end('Not Found');
      return;
    }

    const servedAsset = await tryServeDistAsset(req, res, pathname);
    if (servedAsset) {
      return;
    }

    await serveSpaIndex(res, pathname, null);
  })();
});

server.listen(env.PORT, () => {
  logger.info('HTTP server listening', {
    mode: env.NODE_ENV,
    port: env.PORT,
    webMode: isDevelopment ? 'vite-middleware' : 'dist-static',
  });
});
