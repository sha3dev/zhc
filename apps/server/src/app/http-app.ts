import { Hono } from 'hono';
import { createAgentsRouter, createExpertsRouter } from '../modules/agents/index.js';
import { createConfigurationRouter } from '../modules/configuration/index.js';
import { createExecutionsRouter } from '../modules/executions/index.js';
import { createMailsRouter } from '../modules/mails/index.js';
import { createModelsRouter } from '../modules/models/index.js';
import { createProjectsRouter } from '../modules/projects/index.js';
import { createTasksRouter } from '../modules/tasks/index.js';
import { createToolsRouter } from '../modules/tools/index.js';
import { errorHandler } from '../shared/http/error-handler.js';
import { corsMiddleware, requestLogger } from '../shared/http/middleware.js';
import type { AppContext } from './context.js';

export function createHttpApp(context: AppContext): Hono {
  const app = new Hono();

  app.onError(errorHandler);
  app.use('*', corsMiddleware);
  app.use('*', requestLogger);

  app.get('/api/health', (requestContext) =>
    requestContext.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
    }),
  );

  app.route('/api/agents', createAgentsRouter(context.agents));
  app.route('/api/experts', createExpertsRouter(context.experts));
  app.route('/api/configuration', createConfigurationRouter(context.configuration));
  app.route('/api/executions', createExecutionsRouter(context.executions));
  app.route('/api/mails', createMailsRouter(context.emails));
  app.route('/api/models', createModelsRouter(context.models));
  app.route('/api/projects', createProjectsRouter(context.projects));
  app.route('/api/tasks', createTasksRouter(context.tasks));
  app.route('/api/tools', createToolsRouter(context.tools));

  return app;
}
