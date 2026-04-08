import { Hono } from 'hono';
import { idParamSchema, parseJson, parseParams, parseQuery } from '../../../shared/http/parse.js';
import {
  createAgentInputSchema,
  listAgentsQuerySchema,
  updateAgentInputSchema,
} from '../application/contracts.js';
import type { AgentsService } from '../application/service.js';

export function createAgentsRouter(service: AgentsService): Hono {
  const router = new Hono();

  router.get('/', async (context) => {
    const query = parseQuery(context, listAgentsQuerySchema);
    const result = await service.list(query);

    return context.json({
      items: result.agents,
      limit: query.limit,
      offset: query.offset,
      total: result.total,
    });
  });

  router.get('/hierarchy', async (context) => {
    const hierarchy = await service.getHierarchy();
    return context.json({ items: hierarchy });
  });

  router.get('/stats', async (context) => {
    const stats = await service.getStats();
    return context.json(stats);
  });

  router.get('/:id', async (context) => {
    const { id } = parseParams(context, idParamSchema);
    const agent = await service.getById(id);
    return context.json(agent);
  });

  router.post('/', async (context) => {
    const payload = await parseJson(context, createAgentInputSchema);
    const created = await service.create(payload);
    return context.json(created, 201);
  });

  router.put('/:id', async (context) => {
    const { id } = parseParams(context, idParamSchema);
    const payload = await parseJson(context, updateAgentInputSchema);
    const updated = await service.update(id, payload);
    return context.json(updated);
  });

  router.delete('/:id', async (context) => {
    const { id } = parseParams(context, idParamSchema);
    const archived = await service.archive(id);

    return context.json(
      archived ? { archived: true, id } : { archived: false, id },
      archived ? 200 : 404,
    );
  });

  return router;
}
