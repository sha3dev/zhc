import { describe, expect, it, vi } from 'vitest';
import type {
  TaskEventsRepository,
  TasksRepository,
} from '../../../src/modules/tasks/application/contracts.js';
import { TasksService } from '../../../src/modules/tasks/application/service.js';
import type { Task } from '../../../src/modules/tasks/domain/task.js';
import { NotFoundError, ValidationError } from '../../../src/shared/errors/app-error.js';

const makeTask = (overrides: Partial<Task> = {}): Task => ({
  assignedToAgentId: 2,
  assignedToAgentName: 'Frontend',
  canRun: false,
  completedAt: null,
  createdAt: new Date('2026-04-10T10:00:00.000Z'),
  dependsOnTaskIds: [],
  description: 'desc',
  hasDependencyRisk: false,
  id: 1,
  lastExecutionId: null,
  projectId: 1,
  reopenCount: 0,
  reopenedAt: null,
  reopenedFromTaskEventId: null,
  reviewCycle: 0,
  runBlockedReason: null,
  sort: 0,
  status: 'assigned',
  title: 'Task',
  updatedAt: new Date('2026-04-10T10:00:00.000Z'),
  ...overrides,
});

const repository = (): TasksRepository => ({
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
});

const eventsRepository = (): TaskEventsRepository => ({
  create: vi.fn(),
  findByTaskId: vi.fn(),
});

describe('TasksService', () => {
  it('blocks task start when dependencies are unresolved', async () => {
    const tasksRepository = repository();
    vi.mocked(tasksRepository.canStart).mockResolvedValue(false);
    const service = new TasksService(tasksRepository);

    await expect(service.start(10, 2)).rejects.toBeInstanceOf(ValidationError);
  });

  it('raises NotFoundError when updating an unknown task', async () => {
    const tasksRepository = repository();
    vi.mocked(tasksRepository.updateStatus).mockResolvedValue(null);
    const service = new TasksService(tasksRepository);

    await expect(service.updateStatus(999, 'completed')).rejects.toBeInstanceOf(NotFoundError);
  });

  it('requires workflow dependencies for thread operations', async () => {
    const tasksRepository = repository();
    vi.mocked(tasksRepository.findById).mockResolvedValue(makeTask({ status: 'in_progress' }));
    const service = new TasksService(tasksRepository);

    await expect(service.getThread(1)).rejects.toBeInstanceOf(ValidationError);
  });

  it('exposes run readiness in getById', async () => {
    const tasksRepository = repository();
    vi.mocked(tasksRepository.findById).mockResolvedValue(makeTask({ assignedToAgentId: null }));
    vi.mocked(tasksRepository.canStart).mockResolvedValue(true);
    const service = new TasksService(tasksRepository);

    await expect(service.getById(1)).resolves.toMatchObject({
      canRun: false,
      runBlockedReason: 'Task must be assigned before it can run.',
    });
  });

  it('allows assigned pending tasks to run when dependencies are complete', async () => {
    const tasksRepository = repository();
    vi.mocked(tasksRepository.findById).mockResolvedValue(makeTask({ status: 'pending' }));
    vi.mocked(tasksRepository.canStart).mockResolvedValue(true);
    const service = new TasksService(tasksRepository);

    await expect(service.getById(1)).resolves.toMatchObject({
      canRun: true,
      runBlockedReason: null,
    });
  });

  it('rejects run when task is awaiting review', async () => {
    const tasksRepository = repository();
    const events = eventsRepository();
    vi.mocked(tasksRepository.findById).mockResolvedValue(makeTask({ status: 'awaiting_review' }));
    vi.mocked(tasksRepository.canStart).mockResolvedValue(true);

    const service = new TasksService(
      tasksRepository,
      events,
      {
        findCeo: vi.fn(),
        getById: vi.fn().mockResolvedValue({ id: 1, isCeo: true, key: 'ceo', name: 'CEO' }),
      },
      {
        getById: vi.fn(),
      },
      {
        execute: vi.fn(),
      },
    );

    await expect(service.run(1, { authorAgentId: 1 })).rejects.toThrow(
      'Task cannot run while status is awaiting_review.',
    );
  });

  it('requests changes and starts a new execution cycle', async () => {
    const tasksRepository = repository();
    const events = eventsRepository();
    const existingTask = makeTask({
      completedAt: new Date('2026-04-10T11:00:00.000Z'),
      reviewCycle: 2,
      status: 'completed',
    });
    const iteratingTask = makeTask({
      completedAt: null,
      reviewCycle: 3,
      status: 'changes_requested',
    });
    const inProgressTask = makeTask({
      completedAt: null,
      reviewCycle: 3,
      status: 'in_progress',
    });
    const awaitingReviewTask = makeTask({
      completedAt: null,
      lastExecutionId: 9,
      reviewCycle: 3,
      status: 'awaiting_review',
    });

    vi.mocked(tasksRepository.findById)
      .mockResolvedValueOnce(existingTask)
      .mockResolvedValueOnce(awaitingReviewTask);
    vi.mocked(tasksRepository.canStart).mockResolvedValue(true);
    vi.mocked(tasksRepository.findDependents).mockResolvedValue([]);
    vi.mocked(tasksRepository.update)
      .mockResolvedValueOnce(iteratingTask)
      .mockResolvedValueOnce(inProgressTask)
      .mockResolvedValueOnce(awaitingReviewTask);
    vi.mocked(events.create)
      .mockResolvedValueOnce({
        authorAgentId: 1,
        authorAgentName: 'CEO',
        body: 'Tighten the implementation and verify the failing path.',
        createdAt: new Date(),
        executionId: null,
        id: 40,
        kind: 'reopened',
        metadata: null,
        taskId: 1,
      })
      .mockResolvedValueOnce({
        authorAgentId: 1,
        authorAgentName: 'CEO',
        body: 'Tighten the implementation and verify the failing path.',
        createdAt: new Date(),
        executionId: null,
        id: 41,
        kind: 'ceo_instruction',
        metadata: null,
        taskId: 1,
      })
      .mockResolvedValueOnce({
        authorAgentId: 2,
        authorAgentName: 'Frontend',
        body: 'Done.',
        createdAt: new Date(),
        executionId: 9,
        id: 42,
        kind: 'agent_reply',
        metadata: null,
        taskId: 1,
      })
      .mockResolvedValueOnce({
        authorAgentId: 2,
        authorAgentName: 'Frontend',
        body: 'Submitted work for CEO review.',
        createdAt: new Date(),
        executionId: 9,
        id: 43,
        kind: 'submission',
        metadata: null,
        taskId: 1,
      });
    vi.mocked(events.findByTaskId).mockResolvedValue([]);

    const execute = vi.fn().mockResolvedValue({
      agentId: 2,
      cliId: 'codex',
      composedPrompt: 'prompt',
      context: null,
      durationMs: 1,
      executedAt: '2026-04-10T12:00:00.000Z',
      id: 9,
      model: 'gpt-5',
      operationKey: 'execute-task',
      parsedOutput: null,
      promptBlocks: [],
      promptPath: 'execute-task.md',
      rawOutput: 'Done.',
      sandboxMode: 'workspace-write',
      userInput: 'Tighten the implementation and verify the failing path.',
      validationError: null,
      workingDirectory: '/tmp/project',
    });

    const service = new TasksService(
      tasksRepository,
      events,
      {
        findCeo: vi.fn(),
        getById: vi.fn().mockResolvedValue({ id: 1, isCeo: true, key: 'ceo', name: 'CEO' }),
      },
      {
        getById: vi.fn().mockResolvedValue({
          definitionBrief: 'brief',
          id: 1,
          name: 'Project',
          sourceBrief: 'source',
          tasks: [inProgressTask],
          workingDirectory: '/tmp/project',
        }),
      },
      { execute },
    );

    const result = await service.requestChanges(1, {
      authorAgentId: 1,
      body: 'Tighten the implementation and verify the failing path.',
      sandboxMode: 'workspace-write',
    });

    expect(result.task.status).toBe('awaiting_review');
    expect(result.task.reviewCycle).toBe(3);
    expect(execute).toHaveBeenCalledWith(
      expect.objectContaining({
        agentId: 2,
        sandboxMode: 'workspace-write',
        userInput: 'Tighten the implementation and verify the failing path.',
      }),
    );
  });

  it('marks the task failed when execution throws before agent reply', async () => {
    const tasksRepository = repository();
    const events = eventsRepository();
    const existingTask = makeTask({ status: 'assigned' });
    const inProgressTask = makeTask({ status: 'in_progress' });
    const failedTask = makeTask({ status: 'failed' });

    vi.mocked(tasksRepository.findById).mockResolvedValue(existingTask);
    vi.mocked(tasksRepository.canStart).mockResolvedValue(true);
    vi.mocked(tasksRepository.update)
      .mockResolvedValueOnce(inProgressTask)
      .mockResolvedValueOnce(failedTask);
    vi.mocked(events.create).mockResolvedValue({
      authorAgentId: 1,
      authorAgentName: 'CEO',
      body: 'event',
      createdAt: new Date(),
      executionId: null,
      id: 1,
      kind: 'ceo_instruction',
      metadata: null,
      taskId: 1,
    });
    vi.mocked(events.findByTaskId).mockResolvedValue([]);

    const service = new TasksService(
      tasksRepository,
      events,
      {
        findCeo: vi.fn(),
        getById: vi.fn().mockResolvedValue({ id: 1, isCeo: true, key: 'ceo', name: 'CEO' }),
      },
      {
        getById: vi.fn().mockResolvedValue({
          definitionBrief: 'brief',
          id: 1,
          name: 'Project',
          sourceBrief: 'source',
          tasks: [inProgressTask],
          workingDirectory: '/tmp/project',
        }),
      },
      {
        execute: vi.fn().mockRejectedValue(new Error('CLI crashed')),
      },
    );

    await expect(service.run(1, { authorAgentId: 1 })).rejects.toThrow('CLI crashed');
    expect(tasksRepository.update).toHaveBeenLastCalledWith(1, {
      completedAt: null,
      status: 'failed',
    });
    expect(events.create).toHaveBeenLastCalledWith(
      expect.objectContaining({
        body: 'Execution failed before the agent submitted a response: CLI crashed',
        kind: 'status_changed',
      }),
    );
  });
});
