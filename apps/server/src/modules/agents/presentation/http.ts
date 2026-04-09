import { Hono } from 'hono';
import { z } from 'zod';
import { idParamSchema, parseJson, parseParams, parseQuery } from '../../../shared/http/parse.js';
import { listAgentsQuerySchema } from '../application/contracts.js';
import type { AgentsService } from '../application/service.js';

const createOperationalAgentInputSchema = z
  .object({
    model: z.string().trim().min(1).max(100).nullable().default(null),
    modelCliId: z.string().trim().min(1).max(100).nullable().default(null),
    name: z
      .string()
      .trim()
      .min(1)
      .max(255)
      .regex(/^[a-zA-Z0-9\s\-_]+$/),
    status: z.enum(['ready', 'not_ready', 'suspended']).default('not_ready'),
    subagentMd: z.string().trim().min(50).max(100000),
  })
  .superRefine((value, context) => {
    const hasModel = value.model !== null;
    const hasModelCliId = value.modelCliId !== null;

    if (hasModel !== hasModelCliId) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'model and modelCliId must be provided together',
        path: hasModel ? ['modelCliId'] : ['model'],
      });
    }
  });

const updateOperationalAgentInputSchema = z
  .object({
    model: z.string().trim().min(1).max(100).nullable().optional(),
    modelCliId: z.string().trim().min(1).max(100).nullable().optional(),
    name: z
      .string()
      .trim()
      .min(1)
      .max(255)
      .regex(/^[a-zA-Z0-9\s\-_]+$/)
      .optional(),
    status: z.enum(['ready', 'not_ready', 'suspended']).optional(),
    subagentMd: z.string().trim().min(50).max(100000).optional(),
  })
  .superRefine((value, context) => {
    const touchesModel = 'model' in value || 'modelCliId' in value;
    if (!touchesModel) return;

    const hasModel = value.model !== null && value.model !== undefined;
    const hasModelCliId = value.modelCliId !== null && value.modelCliId !== undefined;
    const clearsBoth = value.model === null && value.modelCliId === null;

    if (!clearsBoth && hasModel !== hasModelCliId) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'model and modelCliId must be provided together',
        path: hasModel ? ['modelCliId'] : ['model'],
      });
    }
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: 'At least one field must be provided',
  });

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
    const payload = await parseJson(context, createOperationalAgentInputSchema);
    const created = await service.create({ ...payload, isCeo: false, kind: 'specialist' });
    return context.json(created, 201);
  });

  router.put('/:id', async (context) => {
    const { id } = parseParams(context, idParamSchema);
    const payload = await parseJson(context, updateOperationalAgentInputSchema);
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
