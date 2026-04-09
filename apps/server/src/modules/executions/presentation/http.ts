import { Hono } from 'hono';
import { z } from 'zod';
import { idParamSchema, parseJson, parseParams, parseQuery } from '../../../shared/http/parse.js';
import {
  listExecutionsQuerySchema,
  sandboxModeSchema,
} from '../application/execution-contracts.js';
import type { ExecutionsService } from '../application/service.js';

const executeAgentInputSchema = z.object({
  agentId: z.number().int().positive(),
  context: z.unknown().optional(),
  operationKey: z
    .string()
    .trim()
    .min(1)
    .max(100)
    .regex(/^[a-z0-9][a-z0-9-]*$/),
  sandboxMode: sandboxModeSchema.optional(),
  userInput: z.string().trim().min(1),
  workingDirectory: z.string().trim().min(1).optional(),
});

export function createExecutionsRouter(service: ExecutionsService): Hono {
  const router = new Hono();

  router.get('/', async (context) => {
    const query = parseQuery(context, listExecutionsQuerySchema);
    const result = await service.list(query);

    return context.json({
      items: result.executions,
      limit: query.limit,
      offset: query.offset,
      total: result.total,
    });
  });

  router.get('/:id', async (context) => {
    const { id } = parseParams(context, idParamSchema);
    return context.json(await service.getById(id));
  });

  router.post('/', async (context) => {
    const payload = await parseJson(context, executeAgentInputSchema);
    const result = await service.execute(payload);
    return context.json(result, 201);
  });

  return router;
}
