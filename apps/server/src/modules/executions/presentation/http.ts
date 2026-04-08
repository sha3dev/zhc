import { Hono } from 'hono';
import { z } from 'zod';
import { parseJson } from '../../../shared/http/parse.js';
import type { ExecutionsService } from '../application/service.js';

const executeAgentInputSchema = z.object({
  agentId: z.number().int().positive(),
  context: z.unknown().optional(),
  operationKey: z.string().trim().min(1).max(100).regex(/^[a-z0-9][a-z0-9-]*$/),
  sandboxMode: z.enum(['read-only', 'workspace-write', 'danger-full-access']).optional(),
  userInput: z.string().trim().min(1),
  workingDirectory: z.string().trim().min(1).optional(),
});

export function createExecutionsRouter(service: ExecutionsService): Hono {
  const router = new Hono();

  router.post('/', async (context) => {
    const payload = await parseJson(context, executeAgentInputSchema);
    const result = await service.execute(payload);
    return context.json(result, 201);
  });

  return router;
}
