import { Hono } from 'hono';
import { idParamSchema, parseParams, parseQuery } from '../../../shared/http/parse.js';
import { listEmailsQuerySchema } from '../application/contracts.js';
import type { EmailsService } from '../application/service.js';

export function createMailsRouter(service: EmailsService): Hono {
  const router = new Hono();

  router.get('/', async (context) => {
    const query = parseQuery(context, listEmailsQuerySchema);
    const result = await service.list(query);

    return context.json({
      items: result.emails,
      limit: query.limit,
      offset: query.offset,
      total: result.total,
    });
  });

  router.get('/:id', async (context) => {
    const { id } = parseParams(context, idParamSchema);
    return context.json(await service.getById(id));
  });

  router.post('/sync', async (context) => context.json(await service.syncInbound()));

  return router;
}
