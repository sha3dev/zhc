import { Hono } from 'hono';
import { idParamSchema, parseJson, parseParams, parseQuery } from '../../../shared/http/parse.js';
import {
  listTasksQuerySchema,
  taskApproveInputSchema,
  taskDispatchInputSchema,
  taskReopenInputSchema,
  taskReplyInputSchema,
  taskRequestChangesInputSchema,
  updateTaskStatusInputSchema,
} from '../application/contracts.js';
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

  router.get('/:id/thread', async (context) => {
    const { id } = parseParams(context, idParamSchema);
    return context.json(await service.getThread(id));
  });

  router.post('/:id/run', async (context) => {
    const { id } = parseParams(context, idParamSchema);
    const payload = await parseJson(context, taskDispatchInputSchema);
    return context.json(await service.run(id, payload));
  });

  router.post('/:id/dispatch', async (context) => {
    const { id } = parseParams(context, idParamSchema);
    const payload = await parseJson(context, taskDispatchInputSchema);
    return context.json(await service.run(id, payload));
  });

  router.post('/:id/reply', async (context) => {
    const { id } = parseParams(context, idParamSchema);
    const payload = await parseJson(context, taskReplyInputSchema);
    return context.json(await service.reply(id, payload));
  });

  router.post('/:id/approve', async (context) => {
    const { id } = parseParams(context, idParamSchema);
    const payload = await parseJson(context, taskApproveInputSchema);
    return context.json(await service.approve(id, payload));
  });

  router.post('/:id/request-changes', async (context) => {
    const { id } = parseParams(context, idParamSchema);
    const payload = await parseJson(context, taskRequestChangesInputSchema);
    return context.json(await service.requestChanges(id, payload));
  });

  router.post('/:id/reopen', async (context) => {
    const { id } = parseParams(context, idParamSchema);
    const payload = await parseJson(context, taskReopenInputSchema);
    return context.json(await service.reopen(id, payload));
  });

  router.patch('/:id/status', async (context) => {
    const { id } = parseParams(context, idParamSchema);
    const payload = await parseJson(context, updateTaskStatusInputSchema);
    const updated = await service.updateStatus(id, payload.status);
    return context.json(updated);
  });

  return router;
}
