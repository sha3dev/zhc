import { describe, expect, it, vi } from 'vitest';
import type { AppContext } from '../../src/app/context.js';
import { createHttpApp } from '../../src/app/http-app.js';
import type { AgentsRepository } from '../../src/modules/agents/application/contracts.js';
import type { ExpertsRepository } from '../../src/modules/agents/application/experts-contracts.js';
import { ExpertsService } from '../../src/modules/agents/application/experts-service.js';
import { AgentsService } from '../../src/modules/agents/application/service.js';
import type { RegistryEntityMemorySummary } from '../../src/modules/agents/domain/expert.js';
import { ExecutionsService } from '../../src/modules/executions/application/service.js';
import type { ExecutionsRepository } from '../../src/modules/executions/index.js';
import { ModelsService } from '../../src/modules/models/application/service.js';
import type {
  ProjectTasksGateway,
  ProjectsRepository,
} from '../../src/modules/projects/application/contracts.js';
import { ProjectsService } from '../../src/modules/projects/application/service.js';
import type { TasksRepository } from '../../src/modules/tasks/application/contracts.js';
import { TasksService } from '../../src/modules/tasks/application/service.js';
import type { ToolsService } from '../../src/modules/tools/application/service.js';

function createContext(): AppContext {
  const agentsRepository: AgentsRepository = {
    archive: vi.fn(),
    count: vi.fn(),
    create: vi.fn(),
    findAll: vi.fn(),
    findCeo: vi.fn(),
    findById: vi.fn(),
    findByIdWithRelations: vi.fn(),
    findForMemory: vi.fn(),
    getHierarchy: vi.fn(),
    getStats: vi.fn(),
    update: vi.fn(),
  };

  const projectsRepository: ProjectsRepository = {
    assignOwner: vi.fn(),
    create: vi.fn(),
    delete: vi.fn(),
    findAll: vi.fn(),
    findById: vi.fn(),
    findBySlug: vi.fn(),
    update: vi.fn(),
    updateStatus: vi.fn(),
  };

  const tasksRepository: TasksRepository = {
    assign: vi.fn(),
    canStart: vi.fn(),
    create: vi.fn(),
    findAll: vi.fn(),
    findDependents: vi.fn(),
    findById: vi.fn(),
    findByProjectId: vi.fn(),
    getNextPendingTasks: vi.fn(),
    setDependencyRisk: vi.fn(),
    update: vi.fn(),
    updateStatus: vi.fn(),
  };

  const projectTasksGateway: ProjectTasksGateway = {
    create: tasksRepository.create,
    findByProjectId: tasksRepository.findByProjectId,
    getNextPendingTasks: tasksRepository.getNextPendingTasks,
    updateStatus: tasksRepository.updateStatus,
  };

  const executions = new ExecutionsService(
    { getById: vi.fn(), listForMemory: vi.fn() },
    { listStatus: vi.fn() },
    { get: vi.fn(), getFragment: vi.fn() },
    { build: vi.fn() },
    {
      create: vi.fn(),
      findById: vi.fn(),
      list: vi.fn(),
    } as ExecutionsRepository,
    [],
  );

  const agents = new AgentsService(agentsRepository);

  vi.spyOn(agents, 'listForMemory').mockResolvedValue([] as never);
  vi.spyOn(agents, 'findCeo').mockResolvedValue({ id: 1, status: 'ready' } as never);
  const experts = new ExpertsService(expertsRepository, agents, executions);
  vi.spyOn(experts, 'listForMemory').mockResolvedValue([] as RegistryEntityMemorySummary[]);

  return {
    agents,
    bootstrap: vi.fn(async () => undefined),
    configuration: { get: vi.fn(), update: vi.fn() } as never,
    emailPoller: { start: vi.fn(), stop: vi.fn() } as never,
    emails: { getById: vi.fn(), list: vi.fn(), syncInbound: vi.fn() } as never,
    executions,
    experts,
    models: new ModelsService({ listStatus: vi.fn() } as unknown as ToolsService),
    projects: new ProjectsService(projectsRepository, projectTasksGateway, agents, executions),
    tasks: new TasksService(tasksRepository),
    tools: { listStatus: vi.fn() } as unknown as ToolsService,
  };
}

describe('HTTP app', () => {
  it('responds to health checks', async () => {
    const app = createHttpApp(createContext());
    const response = await app.request('/api/health');

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({ status: 'ok' });
  });

  it('returns agent listing envelopes', async () => {
    const context = createContext();
    vi.spyOn(context.agents, 'list').mockResolvedValue({
      agents: [],
      total: 0,
    });
    const app = createHttpApp(context);

    const response = await app.request('/api/agents');

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      items: [],
      total: 0,
    });
  });

  it('returns expert listing envelopes', async () => {
    const context = createContext();
    vi.spyOn(context.experts, 'list').mockResolvedValue({
      experts: [],
      total: 0,
    });
    const app = createHttpApp(context);

    const response = await app.request('/api/experts');

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      items: [],
      total: 0,
    });
  });

  it('returns project listing envelopes', async () => {
    const context = createContext();
    vi.spyOn(context.projects, 'list').mockResolvedValue({
      projects: [],
      total: 0,
    });
    const app = createHttpApp(context);

    const response = await app.request('/api/projects');

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      items: [],
      total: 0,
    });
  });

  it('creates projects from a brief-only payload', async () => {
    const context = createContext();
    vi.spyOn(context.projects, 'create').mockResolvedValue({
      activePathIds: [],
      activeTaskId: null,
      artifacts: [],
      completedTaskCount: 0,
      createdAt: new Date('2026-04-09T10:00:00.000Z'),
      createdBy: 'system',
      definitionBrief: 'Expanded implementation brief',
      id: 1,
      name: 'Daily CrossFit',
      ownerAgentId: 1,
      ownerAgentName: 'CEO',
      planningExecutionId: 7,
      slug: 'daily-crossfit',
      sourceBrief: 'Build a workout app',
      status: 'ready',
      taskCount: 1,
      tasks: [],
      updatedAt: new Date('2026-04-09T10:00:00.000Z'),
      workingDirectory: '/tmp/projects/daily-crossfit',
    });
    const app = createHttpApp(context);

    const response = await app.request('/api/projects', {
      body: JSON.stringify({ brief: 'Build a workout app' }),
      headers: { 'Content-Type': 'application/json' },
      method: 'POST',
    });

    expect(response.status).toBe(201);
    await expect(response.json()).resolves.toMatchObject({
      id: 1,
      name: 'Daily CrossFit',
      sourceBrief: 'Build a workout app',
    });
  });

  it('returns project details', async () => {
    const context = createContext();
    vi.spyOn(context.projects, 'getById').mockResolvedValue({
      activePathIds: [],
      activeTaskId: null,
      artifacts: [],
      completedTaskCount: 0,
      createdAt: new Date('2026-04-09T10:00:00.000Z'),
      createdBy: 'system',
      definitionBrief: 'Expanded implementation brief',
      id: 1,
      name: 'Daily CrossFit',
      ownerAgentId: 1,
      ownerAgentName: 'CEO',
      planningExecutionId: 7,
      slug: 'daily-crossfit',
      sourceBrief: 'Build a workout app',
      status: 'ready',
      taskCount: 1,
      tasks: [],
      updatedAt: new Date('2026-04-09T10:00:00.000Z'),
      workingDirectory: '/tmp/projects/daily-crossfit',
    });
    const app = createHttpApp(context);

    const response = await app.request('/api/projects/1');

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      id: 1,
      planningExecutionId: 7,
      definitionBrief: 'Expanded implementation brief',
    });
  });

  it('deletes projects', async () => {
    const context = createContext();
    vi.spyOn(context.projects, 'delete').mockResolvedValue(true);
    const app = createHttpApp(context);

    const response = await app.request('/api/projects/1', { method: 'DELETE' });

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({ ok: true });
  });

  it('returns execution listing envelopes', async () => {
    const context = createContext();
    vi.spyOn(context.executions, 'list').mockResolvedValue({
      executions: [],
      total: 0,
    });
    const app = createHttpApp(context);

    const response = await app.request('/api/executions');

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      items: [],
      total: 0,
    });
  });

  it('returns execution details', async () => {
    const context = createContext();
    vi.spyOn(context.executions, 'getById').mockResolvedValue({
      agentId: 1,
      agentName: 'CEO',
      cliId: 'codex',
      composedPrompt: 'prompt',
      context: null,
      durationMs: 10,
      executedAt: new Date('2026-04-09T10:00:00.000Z'),
      id: 1,
      model: 'gpt-5.4',
      operationKey: 'create-project',
      parsedOutput: null,
      promptBlocks: [],
      promptPath: '/tmp/create-project.md',
      promptPreview: 'prompt',
      rawOutput: 'response',
      responsePreview: 'response',
      sandboxMode: 'read-only',
      userInput: 'build app',
      validationError: null,
      workingDirectory: '/tmp',
    });
    const app = createHttpApp(context);

    const response = await app.request('/api/executions/1');

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      id: 1,
      model: 'gpt-5.4',
      operationKey: 'create-project',
    });
  });
});
const expertsRepository: ExpertsRepository = {
  archive: vi.fn(),
  create: vi.fn(),
  findAll: vi.fn(),
  findById: vi.fn(),
  findByIdWithRelations: vi.fn(),
  findForMemory: vi.fn(),
  findRuntimeActorById: vi.fn(),
  update: vi.fn(),
};
