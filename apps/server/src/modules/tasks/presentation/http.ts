import { Hono } from 'hono';
import { idParamSchema, parseJson, parseParams, parseQuery } from '../../../shared/http/parse.js';
import { listTasksQuerySchema, updateTaskStatusInputSchema } from '../application/contracts.js';
import type { TasksService } from '../application/service.js';

export function createTasksRouter(service: TasksService): Hono {
  const router = new Hono();

  router.get('/', async (context) => {
    const query = parseQuery(context, listTasksQuerySchema);
    const result = await service.list(query);

    return context.json({
      items: result.tasks,
      limit: query.limit,
      offset: query.offset,
      total: result.total,
    });
  });

  router.get('/:id', async (context) => {
    const { id } = parseParams(context, idParamSchema);
    const task = await service.getById(id);
    return context.json(task);
  });

  router.patch('/:id/status', async (context) => {
    const { id } = parseParams(context, idParamSchema);
    const payload = await parseJson(context, updateTaskStatusInputSchema);
    const updated = await service.updateStatus(id, payload.status);
    return context.json(updated);
  });

  return router;
}
