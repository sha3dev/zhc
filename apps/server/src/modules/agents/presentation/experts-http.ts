import { Hono } from 'hono';
import { z } from 'zod';
import { idParamSchema, parseJson, parseParams, parseQuery } from '../../../shared/http/parse.js';
import { listAgentsQuerySchema } from '../application/contracts.js';
import type { ExpertsService } from '../application/experts-service.js';

const createExpertInputSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1)
    .max(255)
    .regex(/^[a-zA-Z0-9\s\-_]+$/),
  subagentMd: z.string().trim().min(50).max(100000),
});

const createExpertDraftInputSchema = z.object({
  brief: z.string().trim().min(1).max(2000),
});

const updateExpertInputSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(1)
      .max(255)
      .regex(/^[a-zA-Z0-9\s\-_]+$/)
      .optional(),
    subagentMd: z.string().trim().min(50).max(100000).optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: 'At least one field must be provided',
  });

export function createExpertsRouter(service: ExpertsService): Hono {
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

  router.get('/:id', async (context) => {
    const { id } = parseParams(context, idParamSchema);
    const expert = await service.getById(id);
    return context.json(expert);
  });

  router.post('/draft', async (context) => {
    const payload = await parseJson(context, createExpertDraftInputSchema);
    const draft = await service.createDraft(payload);
    return context.json(draft, 201);
  });

  router.post('/', async (context) => {
    const payload = await parseJson(context, createExpertInputSchema);
    const created = await service.create(payload);
    return context.json(created, 201);
  });

  router.put('/:id', async (context) => {
    const { id } = parseParams(context, idParamSchema);
    const payload = await parseJson(context, updateExpertInputSchema);
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
