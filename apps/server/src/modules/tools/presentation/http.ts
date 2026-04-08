import { Hono } from 'hono';
import type { ToolsService } from '../application/service.js';

export function createToolsRouter(service: ToolsService): Hono {
  const router = new Hono();

  // GET /api/tools — returns cached status (fetches on first call)
  router.get('/', async (ctx) => {
    const result = await service.listStatus();
    return ctx.json(result);
  });

  // POST /api/tools/recheck — invalidates cache and returns fresh status
  router.post('/recheck', async (ctx) => {
    service.invalidate();
    const result = await service.listStatus();
    return ctx.json(result);
  });

  return router;
}
