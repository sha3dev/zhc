import { Hono } from 'hono';
import { z } from 'zod';
import { idParamSchema, parseJson, parseParams, parseQuery } from '../../../shared/http/parse.js';
import {
  listTasksQuerySchema,
  taskDenyInputSchema,
  taskFeedbackInputSchema,
  taskHumanFeedbackRequestInputSchema,
  taskApproveInputSchema,
  taskRunInputSchema,
  updateTaskStatusInputSchema,
} from '../application/contracts.js';
import type { TasksService } from '../application/service.js';

export function createTasksRouter(service: TasksService): Hono {
  const router = new Hono();
  const attachmentParamsSchema = z.object({
    attachmentId: z.coerce.number().int().positive(),
    id: z.coerce.number().int().positive(),
  });

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

  router.get('/:id/attachments/:attachmentId/content', async (context) => {
    const { attachmentId, id } = parseParams(context, attachmentParamsSchema);
    const file = await service.getAttachmentContent(id, attachmentId);
    context.header('Content-Disposition', file.contentDisposition);
    context.header('Content-Type', file.contentType);
    return context.body(file.content);
  });

  router.post('/:id/run', async (context) => {
    const { id } = parseParams(context, idParamSchema);
    const payload = await parseJson(context, taskRunInputSchema);
    return context.json(await service.run(id, payload));
  });

  router.post('/:id/approve', async (context) => {
    const { id } = parseParams(context, idParamSchema);
    const payload = await parseJson(context, taskApproveInputSchema);
    return context.json(await service.approve(id, payload));
  });

  router.post('/:id/feedback', async (context) => {
    const { id } = parseParams(context, idParamSchema);
    const payload = await parseJson(context, taskFeedbackInputSchema);
    return context.json(await service.provideFeedback(id, payload));
  });

  router.post('/:id/deny', async (context) => {
    const { id } = parseParams(context, idParamSchema);
    const payload = await parseJson(context, taskDenyInputSchema);
    return context.json(await service.deny(id, payload));
  });

  router.post('/:id/human-feedback-request', async (context) => {
    const { id } = parseParams(context, idParamSchema);
    const payload = await parseJson(context, taskHumanFeedbackRequestInputSchema);
    return context.json(await service.requestHumanFeedback(id, payload));
  });

  router.patch('/:id/status', async (context) => {
    const { id } = parseParams(context, idParamSchema);
    const payload = await parseJson(context, updateTaskStatusInputSchema);
    const updated = await service.updateStatus(id, payload.status);
    return context.json(updated);
  });

  return router;
}
