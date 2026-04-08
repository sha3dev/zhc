import { Hono } from 'hono';
import { idParamSchema, parseJson, parseParams, parseQuery } from '../../../shared/http/parse.js';
import {
  createExecutionPlanInputSchema,
  createProjectInputSchema,
  listProjectsQuerySchema,
  updateProjectInputSchema,
} from '../application/contracts.js';
import type { ProjectsService } from '../application/service.js';

export function createProjectsRouter(service: ProjectsService): Hono {
  const router = new Hono();

  router.get('/', async (context) => {
    const query = parseQuery(context, listProjectsQuerySchema);
    const result = await service.list(query);

    return context.json({
      items: result.projects,
      limit: query.limit,
      offset: query.offset,
      total: result.total,
    });
  });

  router.get('/:id', async (context) => {
    const { id } = parseParams(context, idParamSchema);
    const project = await service.getById(id);
    return context.json(project);
  });

  router.post('/', async (context) => {
    const payload = await parseJson(context, createProjectInputSchema);
    const project = await service.create(payload);
    return context.json(project, 201);
  });

  router.put('/:id', async (context) => {
    const { id } = parseParams(context, idParamSchema);
    const payload = await parseJson(context, updateProjectInputSchema);
    const project = await service.update(id, payload);
    return context.json(project);
  });

  router.post('/:id/execution-plan', async (context) => {
    const { id } = parseParams(context, idParamSchema);
    const payload = await parseJson(context, createExecutionPlanInputSchema);
    const project = await service.generateExecutionPlan(id, payload);
    return context.json(project, 201);
  });

  return router;
}
