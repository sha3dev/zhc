import { Hono } from 'hono';
import { parseJson } from '../../../shared/http/parse.js';
import { updateConfigurationInputSchema } from '../application/contracts.js';
import type { ConfigurationService } from '../application/service.js';

export function createConfigurationRouter(service: ConfigurationService): Hono {
  const router = new Hono();

  router.get('/', async (context) => context.json(await service.get()));

  router.put('/', async (context) => {
    const payload = await parseJson(context, updateConfigurationInputSchema);
    return context.json(await service.update(payload));
  });

  return router;
}
