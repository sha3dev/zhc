import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type {
  ProjectPlanner,
  ProjectPlanningAgentLookup,
  ProjectTasksGateway,
  ProjectsRepository,
} from '../../../src/modules/projects/application/contracts.js';
import { ProjectsService } from '../../../src/modules/projects/application/service.js';
import { NotFoundError, ValidationError } from '../../../src/shared/errors/app-error.js';

const baseProject = {
  completedTaskCount: 0,
  createdAt: new Date(),
  createdBy: 'jc',
  definitionBrief: '',
  id: 1,
  name: 'Project',
  ownerAgentId: 1,
  ownerAgentName: 'CEO',
  planningExecutionId: null,
  slug: 'project',
  sourceBrief: 'brief',
  status: 'draft' as const,
  taskCount: 0,
  updatedAt: new Date(),
};

const projectRepository = (): ProjectsRepository => ({
  assignOwner: vi.fn(),
  create: vi.fn(),
  delete: vi.fn(),
  findAll: vi.fn(),
  findById: vi.fn(),
  findBySlug: vi.fn(),
  update: vi.fn(),
  updateStatus: vi.fn(),
});

const tasksGateway = (): ProjectTasksGateway => ({
  create: vi.fn(),
  findByProjectId: vi.fn(),
  getNextPendingTasks: vi.fn(),
  updateStatus: vi.fn(),
});

const agentLookup = (): ProjectPlanningAgentLookup => ({
  findCeo: vi.fn(),
  listForMemory: vi.fn(),
});

const planner = (): ProjectPlanner => ({
  execute: vi.fn(),
});

const tempDirs: string[] = [];

async function createProjectsRoot() {
  const directory = await mkdtemp(join(tmpdir(), 'zhc-projects-'));
  tempDirs.push(directory);
  return directory;
}

afterEach(async () => {
  while (tempDirs.length > 0) {
    const directory = tempDirs.pop();
    if (directory) {
      await rm(directory, { force: true, recursive: true });
    }
  }
});

describe('ProjectsService', () => {
  it('fails if the CEO does not exist', async () => {
    const projects = projectRepository();
    const tasks = tasksGateway();
    const agents = agentLookup();
    const executionPlanner = planner();
    vi.mocked(agents.findCeo).mockResolvedValue(null);

    const service = new ProjectsService(
      projects,
      tasks,
      agents,
      executionPlanner,
      await createProjectsRoot(),
    );

    await expect(service.create({ brief: 'Build a thing' })).rejects.toBeInstanceOf(
      ValidationError,
    );
  });

  it('fails if the CEO is not ready', async () => {
    const projects = projectRepository();
    const tasks = tasksGateway();
    const agents = agentLookup();
    const executionPlanner = planner();
    vi.mocked(agents.findCeo).mockResolvedValue({ id: 1, status: 'not_ready' });

    const service = new ProjectsService(
      projects,
      tasks,
      agents,
      executionPlanner,
      await createProjectsRoot(),
    );

    await expect(service.create({ brief: 'Build a thing' })).rejects.toBeInstanceOf(
      ValidationError,
    );
  });

  it('creates a planned project from a short brief', async () => {
    const projects = projectRepository();
    const tasks = tasksGateway();
    const agents = agentLookup();
    const executionPlanner = planner();

    vi.mocked(agents.findCeo).mockResolvedValue({ id: 1, status: 'ready' });
    vi.mocked(agents.listForMemory).mockResolvedValue([
      {
        id: 1,
        isCeo: true,
        key: 'ceo',
        kind: 'ceo',
        model: 'gpt-5.4',
        modelCliId: 'codex',
        name: 'CEO',
        role: 'Chief Executive Officer',
        status: 'ready',
      },
      {
        id: 2,
        isCeo: false,
        key: 'product-designer',
        kind: 'specialist',
        model: 'gpt-5.4',
        modelCliId: 'codex',
        name: 'Product Designer',
        role: 'Product Designer',
        status: 'ready',
      },
      {
        id: 3,
        isCeo: false,
        key: 'frontend-engineer',
        kind: 'specialist',
        model: 'gpt-5.4',
        modelCliId: 'codex',
        name: 'Frontend Engineer',
        role: 'Frontend Engineer',
        status: 'ready',
      },
    ]);
    vi.mocked(projects.create).mockResolvedValue(baseProject);
    vi.mocked(projects.update).mockResolvedValue({
      ...baseProject,
      definitionBrief: 'Expanded implementation brief',
      name: 'Daily CrossFit',
      planningExecutionId: 77,
      slug: 'daily-crossfit',
      status: 'planning',
    });
    vi.mocked(projects.updateStatus).mockResolvedValue({
      ...baseProject,
      definitionBrief: 'Expanded implementation brief',
      name: 'Daily CrossFit',
      planningExecutionId: 77,
      slug: 'daily-crossfit',
      status: 'ready',
    });
    vi.mocked(projects.findById).mockResolvedValue({
      ...baseProject,
      definitionBrief: 'Expanded implementation brief',
      name: 'Daily CrossFit',
      planningExecutionId: 77,
      slug: 'daily-crossfit',
      status: 'ready',
      taskCount: 2,
    });
    vi.mocked(tasks.create)
      .mockResolvedValueOnce({
        assignedToAgentId: 2,
        assignedToAgentName: 'Product Designer',
        createdAt: new Date(),
        dependsOnTaskIds: [],
        description: 'task markdown',
        id: 11,
        projectId: 1,
        sort: 10,
        status: 'pending',
        title: 'Define scope',
        updatedAt: new Date(),
      })
      .mockResolvedValueOnce({
        assignedToAgentId: 3,
        assignedToAgentName: 'Frontend Engineer',
        createdAt: new Date(),
        dependsOnTaskIds: [11],
        description: 'task markdown',
        id: 12,
        projectId: 1,
        sort: 20,
        status: 'pending',
        title: 'Build UI',
        updatedAt: new Date(),
      });
    vi.mocked(tasks.findByProjectId).mockResolvedValue([
      {
        assignedToAgentId: 2,
        assignedToAgentName: 'Product Designer',
        createdAt: new Date(),
        dependsOnTaskIds: [],
        description: 'task markdown',
        id: 11,
        projectId: 1,
        sort: 10,
        status: 'pending',
        title: 'Define scope',
        updatedAt: new Date(),
      },
      {
        assignedToAgentId: 3,
        assignedToAgentName: 'Frontend Engineer',
        createdAt: new Date(),
        dependsOnTaskIds: [11],
        description: 'task markdown',
        id: 12,
        projectId: 1,
        sort: 20,
        status: 'pending',
        title: 'Build UI',
        updatedAt: new Date(),
      },
    ]);
    vi.mocked(executionPlanner.execute).mockResolvedValue({
      agentId: 1,
      cliId: 'codex',
      composedPrompt: 'prompt',
      context: undefined,
      durationMs: 5,
      executedAt: new Date().toISOString(),
      id: 77,
      model: 'gpt-5.4',
      operationKey: 'create-project',
      parsedOutput: {
        definitionBrief: 'Expanded implementation brief',
        name: 'Daily CrossFit',
        supportArtifacts: [
          {
            content: '# Project Brief\nDetailed implementation context.',
            path: 'docs/project-brief.md',
            title: 'Project Brief',
          },
        ],
        tasks: [
          {
            acceptanceCriteria: ['Scope and UX are documented'],
            assignedToAgentKey: 'product-designer',
            dependsOnTaskKeys: [],
            description: 'Define the product scope and UX.',
            deliverable: 'A developer-ready product specification',
            implementationNotes: ['Clarify assumptions and user flows'],
            key: 'define-scope',
            sort: 10,
            title: 'Define scope',
          },
          {
            acceptanceCriteria: ['App shell exists', 'First workout page is implemented'],
            assignedToAgentKey: 'frontend-engineer',
            dependsOnTaskKeys: ['define-scope'],
            description: 'Build the app shell and first workout page.',
            deliverable: 'Initial UI implementation checked into the project app folder',
            implementationNotes: ['Use the spec from define-scope'],
            key: 'build-ui',
            sort: 20,
            title: 'Build UI',
          },
        ],
      },
      promptBlocks: [],
      promptPath: '/tmp/create-project.md',
      rawOutput: '{}',
      sandboxMode: 'read-only',
      userInput: 'Daily CrossFit...',
      validationError: null,
      workingDirectory: '/tmp',
    });

    const projectsRoot = await createProjectsRoot();
    const service = new ProjectsService(projects, tasks, agents, executionPlanner, projectsRoot);
    const result = await service.create({
      brief: 'Web a la que llamaremos daily crossfit, que cada dia te da una rutina',
      createdBy: 'jc',
    });

    expect(projects.create).toHaveBeenCalledWith(
      expect.objectContaining({
        createdBy: 'jc',
        definitionBrief: '',
        ownerAgentId: 1,
        planningExecutionId: null,
      }),
    );
    expect(executionPlanner.execute).toHaveBeenCalledWith({
      agentId: 1,
      operationKey: 'create-project',
      userInput: 'Web a la que llamaremos daily crossfit, que cada dia te da una rutina',
      workingDirectory: expect.stringContaining(projectsRoot),
    });
    expect(tasks.create).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        assignedToAgentId: 3,
        dependsOnTaskIds: [11],
        projectId: 1,
      }),
    );
    expect(result.definitionBrief).toBe('Expanded implementation brief');
    expect(result.tasks).toHaveLength(2);
    expect(result.planningExecutionId).toBe(77);
    expect(result.workingDirectory).toContain('daily-crossfit');
    expect(result.artifacts).toEqual(
      expect.arrayContaining([{ path: 'docs/project-brief.md', title: 'project brief' }]),
    );
  });

  it('rejects duplicate task keys', async () => {
    const projects = projectRepository();
    const tasks = tasksGateway();
    const agents = agentLookup();
    const executionPlanner = planner();
    vi.mocked(agents.findCeo).mockResolvedValue({ id: 1, status: 'ready' });
    vi.mocked(projects.create).mockResolvedValue(baseProject);
    vi.mocked(executionPlanner.execute).mockResolvedValue({
      agentId: 1,
      cliId: 'codex',
      composedPrompt: 'prompt',
      context: undefined,
      durationMs: 5,
      executedAt: new Date().toISOString(),
      id: 77,
      model: 'gpt-5.4',
      operationKey: 'create-project',
      parsedOutput: {
        definitionBrief: 'Expanded implementation brief',
        name: 'Daily CrossFit',
        supportArtifacts: [
          {
            content: '# Project Brief\nDetailed implementation context.',
            path: 'docs/project-brief.md',
            title: 'Project Brief',
          },
        ],
        tasks: [
          {
            acceptanceCriteria: ['one'],
            dependsOnTaskKeys: [],
            description: 'one',
            deliverable: 'one',
            implementationNotes: [],
            key: 'dup',
            sort: 10,
            title: 'One',
          },
          {
            acceptanceCriteria: ['two'],
            dependsOnTaskKeys: [],
            description: 'two',
            deliverable: 'two',
            implementationNotes: [],
            key: 'dup',
            sort: 20,
            title: 'Two',
          },
        ],
      },
      promptBlocks: [],
      promptPath: '/tmp/create-project.md',
      rawOutput: '{}',
      sandboxMode: 'read-only',
      userInput: 'Daily CrossFit...',
      validationError: null,
      workingDirectory: '/tmp',
    });

    const service = new ProjectsService(
      projects,
      tasks,
      agents,
      executionPlanner,
      await createProjectsRoot(),
    );

    await expect(service.create({ brief: 'Build it' })).rejects.toBeInstanceOf(ValidationError);
  });

  it('rejects unknown dependency keys', async () => {
    const projects = projectRepository();
    const tasks = tasksGateway();
    const agents = agentLookup();
    const executionPlanner = planner();
    vi.mocked(agents.findCeo).mockResolvedValue({ id: 1, status: 'ready' });
    vi.mocked(projects.create).mockResolvedValue(baseProject);
    vi.mocked(executionPlanner.execute).mockResolvedValue({
      agentId: 1,
      cliId: 'codex',
      composedPrompt: 'prompt',
      context: undefined,
      durationMs: 5,
      executedAt: new Date().toISOString(),
      id: 77,
      model: 'gpt-5.4',
      operationKey: 'create-project',
      parsedOutput: {
        definitionBrief: 'Expanded implementation brief',
        name: 'Daily CrossFit',
        supportArtifacts: [
          {
            content: '# Project Brief\nDetailed implementation context.',
            path: 'docs/project-brief.md',
            title: 'Project Brief',
          },
        ],
        tasks: [
          {
            acceptanceCriteria: ['one'],
            dependsOnTaskKeys: ['missing'],
            description: 'one',
            deliverable: 'one',
            implementationNotes: [],
            key: 'task-1',
            sort: 10,
            title: 'One',
          },
        ],
      },
      promptBlocks: [],
      promptPath: '/tmp/create-project.md',
      rawOutput: '{}',
      sandboxMode: 'read-only',
      userInput: 'Daily CrossFit...',
      validationError: null,
      workingDirectory: '/tmp',
    });

    const service = new ProjectsService(
      projects,
      tasks,
      agents,
      executionPlanner,
      await createProjectsRoot(),
    );

    await expect(service.create({ brief: 'Build it' })).rejects.toBeInstanceOf(ValidationError);
  });

  it('loads project details with task aggregation', async () => {
    const projects = projectRepository();
    const tasks = tasksGateway();
    const agents = agentLookup();
    const executionPlanner = planner();
    vi.mocked(projects.findById).mockResolvedValue({
      ...baseProject,
      status: 'ready',
    });
    vi.mocked(tasks.findByProjectId).mockResolvedValue([]);

    const service = new ProjectsService(
      projects,
      tasks,
      agents,
      executionPlanner,
      await createProjectsRoot(),
    );
    const result = await service.getById(1);

    expect(result.id).toBe(1);
    expect(result.artifacts).toEqual([]);
    expect(result.tasks).toEqual([]);
  });

  it('fails with NotFoundError when loading an unknown project', async () => {
    const projects = projectRepository();
    const tasks = tasksGateway();
    const agents = agentLookup();
    const executionPlanner = planner();
    vi.mocked(projects.findById).mockResolvedValue(null);

    const service = new ProjectsService(
      projects,
      tasks,
      agents,
      executionPlanner,
      await createProjectsRoot(),
    );

    await expect(service.getById(99)).rejects.toBeInstanceOf(NotFoundError);
  });
});
