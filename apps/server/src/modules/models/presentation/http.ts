import { Hono } from 'hono';
import type { ModelsService } from '../application/service.js';

export function createModelsRouter(service: ModelsService): Hono {
  const router = new Hono();

  // GET /api/models
  router.get('/', async (ctx) => {
    const models = await service.listAll();
    return ctx.json({ items: models, total: models.length });
  });

  return router;
}
