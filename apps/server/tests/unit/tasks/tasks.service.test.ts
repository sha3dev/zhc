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
  reviewCycle: 0,
  runBlockedReason: null,
  sort: 0,
  status: 'pending',
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
  findAttachment: vi.fn(),
  findByTaskId: vi.fn(),
});

const ceoLookup = {
  findCeo: vi.fn(),
  getById: vi.fn().mockResolvedValue({ id: 1, isCeo: true, key: 'ceo', name: 'CEO' }),
};

const projectLookup = {
  getById: vi.fn().mockResolvedValue({
    definitionBrief: 'brief',
    id: 1,
    name: 'Project',
    sourceBrief: 'source',
    tasks: [makeTask({ status: 'in_progress' })],
    workingDirectory: '/tmp/project',
  }),
};

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

  it('exposes run readiness in getById', async () => {
    const tasksRepository = repository();
    vi.mocked(tasksRepository.findById).mockResolvedValue(makeTask({ assignedToAgentId: null }));
    vi.mocked(tasksRepository.canStart).mockResolvedValue(true);
    const service = new TasksService(tasksRepository);

    await expect(service.getById(1)).resolves.toMatchObject({
      canRun: false,
      runBlockedReason: 'Task must have an assigned agent or expert.',
    });
  });

  it('allows pending tasks to run when dependencies are complete', async () => {
    const tasksRepository = repository();
    vi.mocked(tasksRepository.findById).mockResolvedValue(makeTask({ status: 'pending' }));
    vi.mocked(tasksRepository.canStart).mockResolvedValue(true);
    const service = new TasksService(tasksRepository);

    await expect(service.getById(1)).resolves.toMatchObject({
      canRun: true,
      runBlockedReason: null,
    });
  });

  it('rejects run when task is already waiting', async () => {
    const tasksRepository = repository();
    const events = eventsRepository();
    vi.mocked(tasksRepository.findById).mockResolvedValue(makeTask({ status: 'waiting' }));
    vi.mocked(tasksRepository.canStart).mockResolvedValue(true);

    const service = new TasksService(tasksRepository, events, ceoLookup, projectLookup, {
      execute: vi.fn(),
    });

    await expect(service.run(1, { authorAgentId: 1 })).rejects.toThrow(
      'Task cannot run while status is waiting.',
    );
  });

  it('runs a task and stores an agent_response before moving to waiting', async () => {
    const tasksRepository = repository();
    const events = eventsRepository();
    const existingTask = makeTask({ status: 'pending' });
    const inProgressTask = makeTask({ status: 'in_progress' });
    const waitingTask = makeTask({ lastExecutionId: 9, status: 'waiting' });

    vi.mocked(tasksRepository.findById)
      .mockResolvedValueOnce(existingTask)
      .mockResolvedValueOnce(waitingTask);
    vi.mocked(tasksRepository.canStart).mockResolvedValue(true);
    vi.mocked(tasksRepository.update)
      .mockResolvedValueOnce(inProgressTask)
      .mockResolvedValueOnce(waitingTask);
    vi.mocked(events.create).mockResolvedValue({
      attachments: [],
      authorAgentId: 1,
      authorAgentName: 'CEO',
      body: 'event',
      createdAt: new Date(),
      executionId: null,
      id: 1,
      kind: 'run_request',
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
      parsedOutput: {
        body: 'Implemented the task. Ready for review.',
        responseType: 'ready_for_approval',
        summary: 'Task complete',
      },
      promptBlocks: [],
      promptPath: 'execute-task.md',
      rawOutput:
        '{"responseType":"ready_for_approval","body":"Implemented the task. Ready for review.","summary":"Task complete"}',
      sandboxMode: 'workspace-write',
      userInput: 'Run task',
      validationError: null,
      workingDirectory: '/tmp/project',
    });

    const service = new TasksService(tasksRepository, events, ceoLookup, projectLookup, { execute });
    const result = await service.run(1, {
      authorAgentId: 1,
      instruction: 'Run task',
      sandboxMode: 'workspace-write',
    });

    expect(result.task.status).toBe('waiting');
    expect(events.create).toHaveBeenCalledWith(
      expect.objectContaining({
        body: 'Implemented the task. Ready for review.',
        executionId: 9,
        kind: 'agent_response',
        metadata: expect.objectContaining({
          responseType: 'ready_for_approval',
          summary: 'Task complete',
        }),
      }),
    );
  });

  it('records ceo feedback and starts a new run', async () => {
    const tasksRepository = repository();
    const events = eventsRepository();
    const waitingTask = makeTask({ reviewCycle: 1, status: 'waiting' });
    const pendingTask = makeTask({ reviewCycle: 2, status: 'pending' });
    const inProgressTask = makeTask({ reviewCycle: 2, status: 'in_progress' });
    const finalTask = makeTask({ lastExecutionId: 10, reviewCycle: 2, status: 'waiting' });

    vi.mocked(tasksRepository.findById)
      .mockResolvedValueOnce(waitingTask)
      .mockResolvedValueOnce(finalTask);
    vi.mocked(tasksRepository.canStart).mockResolvedValue(true);
    vi.mocked(tasksRepository.update)
      .mockResolvedValueOnce(pendingTask)
      .mockResolvedValueOnce(inProgressTask)
      .mockResolvedValueOnce(finalTask);
    vi.mocked(events.create).mockResolvedValue({
      attachments: [],
      authorAgentId: 1,
      authorAgentName: 'CEO',
      body: 'event',
      createdAt: new Date(),
      executionId: null,
      id: 1,
      kind: 'ceo_response',
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
      id: 10,
      model: 'gpt-5',
      operationKey: 'execute-task',
      parsedOutput: {
        body: 'I still need a final approval pass.',
        responseType: 'ready_for_approval',
        summary: 'Updated from CEO feedback',
      },
      promptBlocks: [],
      promptPath: 'execute-task.md',
      rawOutput:
        '{"responseType":"ready_for_approval","body":"I still need a final approval pass.","summary":"Updated from CEO feedback"}',
      sandboxMode: 'workspace-write',
      userInput: 'Clarify the edge case',
      validationError: null,
      workingDirectory: '/tmp/project',
    });

    const service = new TasksService(tasksRepository, events, ceoLookup, projectLookup, { execute });
    const result = await service.provideFeedback(1, {
      authorAgentId: 1,
      body: 'Clarify the edge case',
      sandboxMode: 'workspace-write',
    });

    expect(result.task.reviewCycle).toBe(2);
    expect(execute).toHaveBeenCalledWith(
      expect.objectContaining({
        sandboxMode: 'workspace-write',
        userInput: 'Clarify the edge case',
      }),
    );
  });

  it('approves a waiting task', async () => {
    const tasksRepository = repository();
    const events = eventsRepository();
    const waitingTask = makeTask({ status: 'waiting' });
    const completedTask = makeTask({
      completedAt: new Date('2026-04-10T11:00:00.000Z'),
      status: 'completed',
    });

    vi.mocked(tasksRepository.findById).mockResolvedValue(waitingTask);
    vi.mocked(tasksRepository.canStart).mockResolvedValue(true);
    vi.mocked(tasksRepository.update).mockResolvedValue(completedTask);
    vi.mocked(tasksRepository.findDependents).mockResolvedValue([]);
    vi.mocked(events.create).mockResolvedValue({
      attachments: [],
      authorAgentId: 1,
      authorAgentName: 'CEO',
      body: 'Approved by CEO.',
      createdAt: new Date(),
      executionId: null,
      id: 1,
      kind: 'ceo_response',
      metadata: null,
      taskId: 1,
    });

    const service = new TasksService(tasksRepository, events, ceoLookup, projectLookup, {
      execute: vi.fn(),
    });
    const result = await service.approve(1, { authorAgentId: 1 });

    expect(result.status).toBe('completed');
    expect(events.create).toHaveBeenCalledWith(
      expect.objectContaining({
        kind: 'ceo_response',
        metadata: expect.objectContaining({ responseType: 'approved' }),
      }),
    );
  });

  it('marks the task failed when execution throws before agent response', async () => {
    const tasksRepository = repository();
    const events = eventsRepository();
    const existingTask = makeTask({ status: 'pending' });
    const inProgressTask = makeTask({ status: 'in_progress' });
    const failedTask = makeTask({ status: 'failed' });

    vi.mocked(tasksRepository.findById).mockResolvedValue(existingTask);
    vi.mocked(tasksRepository.canStart).mockResolvedValue(true);
    vi.mocked(tasksRepository.update)
      .mockResolvedValueOnce(inProgressTask)
      .mockResolvedValueOnce(failedTask);
    vi.mocked(events.create).mockResolvedValue({
      attachments: [],
      authorAgentId: 1,
      authorAgentName: 'CEO',
      body: 'event',
      createdAt: new Date(),
      executionId: null,
      id: 1,
      kind: 'run_request',
      metadata: null,
      taskId: 1,
    });
    vi.mocked(events.findByTaskId).mockResolvedValue([]);

    const service = new TasksService(tasksRepository, events, ceoLookup, projectLookup, {
      execute: vi.fn().mockRejectedValue(new Error('CLI crashed')),
    });

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

  it('creates a human feedback request and sends an email', async () => {
    const tasksRepository = repository();
    const events = eventsRepository();
    const waitingTask = makeTask({ status: 'waiting' });

    vi.mocked(tasksRepository.findById).mockResolvedValue(waitingTask);
    vi.mocked(tasksRepository.canStart).mockResolvedValue(true);
    vi.mocked(events.create).mockResolvedValue({
      attachments: [],
      authorAgentId: 1,
      authorAgentName: 'CEO',
      body: 'Need your decision',
      createdAt: new Date(),
      executionId: null,
      id: 33,
      kind: 'human_feedback_request',
      metadata: null,
      taskId: 1,
    });

    const emails = { send: vi.fn().mockResolvedValue({}) };
    const configuration = { get: vi.fn().mockResolvedValue({ human: { email: 'human@example.com' } }) };

    const service = new TasksService(
      tasksRepository,
      events,
      ceoLookup,
      projectLookup,
      { execute: vi.fn() },
      configuration as never,
      emails,
    );

    await service.requestHumanFeedback(1, {
      authorAgentId: 1,
      body: 'Need your decision',
    });

    expect(emails.send).toHaveBeenCalledWith(
      expect.objectContaining({
        subject: '[Task 1] Human feedback requested',
        text: expect.stringContaining('TASK-1-EVENT-33'),
        to: ['human@example.com'],
      }),
    );
  });
});
