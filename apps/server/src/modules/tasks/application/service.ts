import { NotFoundError, ValidationError } from '../../../shared/errors/app-error.js';
import type { ExecutionResult } from '../../executions/domain/execution.js';
import type { TaskEvent } from '../domain/task-event.js';
import type { Task } from '../domain/task.js';
import type {
  CreateTaskInput,
  TaskApproveInput,
  TaskDispatchInput,
  TaskEventsRepository,
  TaskReopenInput,
  TaskReplyInput,
  TaskRequestChangesInput,
  TasksRepository,
} from './contracts.js';

interface AgentLookup {
  findCeo(): Promise<{ id: number } | null>;
  getById(id: number): Promise<{ id: number; isCeo: boolean; key: string; name: string }>;
}

interface ProjectLookup {
  getById(projectId: number): Promise<{
    definitionBrief: string;
    id: number;
    name: string;
    sourceBrief: string;
    tasks: Task[];
    workingDirectory: string;
  }>;
}

interface TaskExecutionRunner {
  execute(input: {
    agentId: number;
    context?: unknown;
    operationKey: string;
    sandboxMode?: 'read-only' | 'workspace-write' | 'danger-full-access';
    userInput: string;
    workingDirectory?: string;
  }): Promise<ExecutionResult<unknown>>;
}

type TaskRunState = {
  canRun: boolean;
  runBlockedReason: string | null;
};

const RUNNABLE_TASK_STATUSES = new Set<Task['status']>([
  'pending',
  'assigned',
  'in_progress',
  'changes_requested',
  'reopened',
  'failed',
]);

function canParticipate(task: Task, authorAgentId: number, isCeo: boolean): boolean {
  return isCeo || task.assignedToAgentId === authorAgentId;
}

function buildTreePath(taskId: number, tasks: Task[]): number[] {
  const taskById = new Map(tasks.map((task) => [task.id, task]));
  const path = new Set<number>();

  const walk = (currentId: number) => {
    if (path.has(currentId)) {
      return;
    }

    path.add(currentId);
    const current = taskById.get(currentId);
    if (!current) {
      return;
    }

    for (const dependencyId of current.dependsOnTaskIds) {
      walk(dependencyId);
    }
  };

  walk(taskId);
  return Array.from(path);
}

function defaultDispatchInstruction(task: Task): string {
  return [
    `Execute task: ${task.title}.`,
    'Use the task brief and current thread context to determine the next concrete implementation step.',
    'Advance the work, report what changed, and hand back a concise review summary for the CEO.',
  ].join(' ');
}

function errorToMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  return String(error);
}

function getTaskRunState(task: Task, dependenciesCompleted: boolean): TaskRunState {
  if (!task.assignedToAgentId) {
    return {
      canRun: false,
      runBlockedReason: 'Task must be assigned before it can run.',
    };
  }

  if (!dependenciesCompleted) {
    return {
      canRun: false,
      runBlockedReason: 'Task is blocked until all dependencies are completed.',
    };
  }

  if (!RUNNABLE_TASK_STATUSES.has(task.status)) {
    return {
      canRun: false,
      runBlockedReason: `Task cannot run while status is ${task.status}.`,
    };
  }

  return {
    canRun: true,
    runBlockedReason: null,
  };
}

export class TasksService {
  constructor(
    private readonly repository: TasksRepository,
    private readonly events?: TaskEventsRepository,
    private readonly agents?: AgentLookup,
    private readonly projects?: ProjectLookup,
    private readonly executions?: TaskExecutionRunner,
  ) {}

  assign(taskId: number, agentId: number): Promise<Task | null> {
    return this.repository.assign(taskId, agentId);
  }

  async create(input: CreateTaskInput): Promise<Task> {
    return this.decorateTask(await this.repository.create(input));
  }

  async getById(id: number): Promise<Task> {
    const task = await this.getRawTaskById(id);

    return this.decorateTask(task);
  }

  async getThread(taskId: number): Promise<TaskEvent[]> {
    await this.getById(taskId);
    this.ensureWorkflowDependencies();
    return this.events!.findByTaskId(taskId);
  }

  async list(
    query: Parameters<TasksRepository['findAll']>[0],
  ): Promise<{ tasks: Task[]; total: number }> {
    const result = await this.repository.findAll(query);

    return {
      tasks: await Promise.all(result.tasks.map((task) => this.decorateTask(task))),
      total: result.total,
    };
  }

  async listByProject(projectId: number): Promise<Task[]> {
    const tasks = await this.repository.findByProjectId(projectId);
    return this.decorateTasksForProject(tasks);
  }

  async nextPending(projectId: number): Promise<Task[]> {
    const tasks = await this.repository.getNextPendingTasks(projectId);
    return this.decorateTasksForProject(tasks);
  }

  async start(taskId: number, agentId: number): Promise<Task> {
    const canStart = await this.repository.canStart(taskId);

    if (!canStart) {
      throw new ValidationError(`Task ${taskId} cannot start until dependencies are completed`);
    }

    const assigned = await this.repository.assign(taskId, agentId);

    if (!assigned) {
      throw new NotFoundError(`Task ${taskId} not found`);
    }

    return this.decorateTask(assigned);
  }

  async run(
    taskId: number,
    input: TaskDispatchInput,
  ): Promise<{
    execution: ExecutionResult<unknown>;
    task: Task;
    thread: TaskEvent[];
  }> {
    this.ensureWorkflowDependencies();

    const task = await this.getRawTaskById(taskId);
    const author = await this.agents!.getById(input.authorAgentId);
    if (!author.isCeo) {
      throw new ValidationError('Only the CEO can run a task');
    }

    const assignedAgentId = input.agentId ?? task.assignedToAgentId;
    if (!assignedAgentId) {
      throw new ValidationError(`Task ${taskId} has no assigned agent`);
    }

    const instruction = input.instruction?.trim() || defaultDispatchInstruction(task);
    return this.executeTaskCycle(task, {
      assignedAgentId,
      authorAgentId: author.id,
      sandboxMode: input.sandboxMode,
      statusBeforeRun: task.status,
      instruction,
      workingDirectory: input.workingDirectory,
    });
  }

  async reply(taskId: number, input: TaskReplyInput): Promise<{ task: Task; thread: TaskEvent[] }> {
    this.ensureWorkflowDependencies();
    const task = await this.getRawTaskById(taskId);
    const author = await this.agents!.getById(input.authorAgentId);

    if (!canParticipate(task, author.id, author.isCeo)) {
      throw new ValidationError('Only the CEO or assigned agent can reply on this task thread');
    }

    const eventKind = author.isCeo ? 'ceo_instruction' : 'agent_reply';
    await this.events!.create({
      authorAgentId: author.id,
      body: input.body,
      kind: eventKind,
      metadata: { reviewCycle: task.reviewCycle },
      taskId,
    });

    let nextTask = task;
    if (input.markAsSubmission) {
      await this.events!.create({
        authorAgentId: author.id,
        body: 'Submitted work for CEO review.',
        kind: 'submission',
        metadata: { manual: true, reviewCycle: task.reviewCycle },
        taskId,
      });
      nextTask = (await this.repository.update(taskId, { status: 'awaiting_review' })) ?? task;
    }

    return {
      task: await this.decorateTask(nextTask),
      thread: await this.events!.findByTaskId(taskId),
    };
  }

  async approve(taskId: number, input: TaskApproveInput): Promise<Task> {
    this.ensureWorkflowDependencies();
    const task = await this.getRawTaskById(taskId);
    const author = await this.agents!.getById(input.authorAgentId);

    if (!author.isCeo) {
      throw new ValidationError('Only the CEO can approve a task');
    }

    if (task.status !== 'awaiting_review') {
      throw new ValidationError('Only tasks awaiting review can be approved');
    }

    await this.events!.create({
      authorAgentId: author.id,
      body: input.body,
      kind: 'approval',
      metadata: { reviewCycle: task.reviewCycle },
      taskId,
    });

    const updated = await this.repository.update(taskId, {
      completedAt: new Date(),
      status: 'completed',
    });

    if (!updated) {
      throw new NotFoundError(`Task ${taskId} not found`);
    }

    const dependents = await this.repository.findDependents(taskId);
    await this.repository.setDependencyRisk(
      dependents.map((dependent) => dependent.id),
      false,
    );

    return this.decorateTask(updated);
  }

  async requestChanges(
    taskId: number,
    input: TaskRequestChangesInput,
  ): Promise<{
    execution: ExecutionResult<unknown>;
    task: Task;
    thread: TaskEvent[];
  }> {
    this.ensureWorkflowDependencies();
    const task = await this.getRawTaskById(taskId);
    const author = await this.agents!.getById(input.authorAgentId);

    if (!author.isCeo) {
      throw new ValidationError('Only the CEO can request changes');
    }

    if (!['awaiting_review', 'completed'].includes(task.status)) {
      throw new ValidationError('Changes can only be requested from review or closed tasks');
    }

    const nextReviewCycle = task.reviewCycle + 1;
    const changeEventKind = task.status === 'completed' ? 'reopened' : 'changes_requested';
    const changeEvent = await this.events!.create({
      authorAgentId: author.id,
      body: input.body,
      kind: changeEventKind,
      metadata: {
        nextReviewCycle,
        priorCompletedAt: task.completedAt?.toISOString() ?? null,
        previousStatus: task.status,
      },
      taskId,
    });

    const updated = await this.repository.update(taskId, {
      completedAt: null,
      hasDependencyRisk: false,
      reopenedAt: task.status === 'completed' ? new Date() : task.reopenedAt,
      reopenedFromTaskEventId:
        task.status === 'completed' ? changeEvent.id : task.reopenedFromTaskEventId,
      reopenCount: task.status === 'completed' ? task.reopenCount + 1 : task.reopenCount,
      reviewCycle: nextReviewCycle,
      status: 'changes_requested',
    });

    if (!updated) {
      throw new NotFoundError(`Task ${taskId} not found`);
    }

    if (task.status === 'completed') {
      await this.flagDependencyRisk(taskId, author.id, true);
    }

    return this.executeTaskCycle(updated, {
      assignedAgentId: updated.assignedToAgentId,
      authorAgentId: author.id,
      sandboxMode: input.sandboxMode,
      statusBeforeRun: task.status,
      instruction: input.body,
      workingDirectory: input.workingDirectory,
    });
  }

  async reopen(taskId: number, input: TaskReopenInput): Promise<Task> {
    const result = await this.requestChanges(taskId, {
      authorAgentId: input.authorAgentId,
      body: input.instruction?.trim() || input.body,
    });

    return result.task;
  }

  async updateStatus(taskId: number, status: Task['status']): Promise<Task> {
    const updated = await this.repository.updateStatus(taskId, status);

    if (!updated) {
      throw new NotFoundError(`Task ${taskId} not found`);
    }

    return this.decorateTask(updated);
  }

  private ensureWorkflowDependencies(): void {
    if (!this.events || !this.agents || !this.projects || !this.executions) {
      throw new ValidationError('Task workflow dependencies are not configured');
    }
  }

  private async getRawTaskById(id: number): Promise<Task> {
    const task = await this.repository.findById(id);

    if (!task) {
      throw new NotFoundError(`Task ${id} not found`);
    }

    return task;
  }

  private async decorateTask(task: Task): Promise<Task> {
    const canStart = await this.repository.canStart(task.id);
    return {
      ...task,
      ...getTaskRunState(task, canStart),
    };
  }

  private async decorateTasksForProject(tasks: Task[]): Promise<Task[]> {
    const completedById = new Map(tasks.map((task) => [task.id, task.status === 'completed']));

    return tasks.map((task) => ({
      ...task,
      ...getTaskRunState(
        task,
        task.dependsOnTaskIds.every((dependencyId) => completedById.get(dependencyId) === true),
      ),
    }));
  }

  private async executeTaskCycle(
    task: Task,
    input: {
      assignedAgentId: number | null;
      authorAgentId: number;
      instruction: string;
      sandboxMode?: 'read-only' | 'workspace-write' | 'danger-full-access';
      statusBeforeRun: Task['status'];
      workingDirectory?: string;
    },
  ): Promise<{
    execution: ExecutionResult<unknown>;
    task: Task;
    thread: TaskEvent[];
  }> {
    const { canRun, runBlockedReason } = await this.decorateTask(task);
    const assignedAgentId = input.assignedAgentId ?? task.assignedToAgentId;

    if (!assignedAgentId) {
      throw new ValidationError(`Task ${task.id} has no assigned agent`);
    }

    if (!canRun) {
      throw new ValidationError(runBlockedReason ?? `Task ${task.id} cannot run`);
    }

    let currentTask = task;
    if (task.assignedToAgentId !== assignedAgentId) {
      const assigned = await this.repository.assign(task.id, assignedAgentId);
      if (!assigned) {
        throw new NotFoundError(`Task ${task.id} not found`);
      }
      currentTask = assigned;
      await this.events!.create({
        authorAgentId: input.authorAgentId,
        body: `Assigned task to agent #${assignedAgentId}.`,
        kind: 'assignment',
        metadata: { assignedAgentId },
        taskId: task.id,
      });
    }

    await this.events!.create({
      authorAgentId: input.authorAgentId,
      body: input.instruction,
      kind: 'ceo_instruction',
      metadata: {
        assignedAgentId,
        reviewCycle: currentTask.reviewCycle,
        statusBeforeRun: input.statusBeforeRun,
      },
      taskId: task.id,
    });

    currentTask =
      (await this.repository.update(task.id, {
        completedAt: null,
        status: 'in_progress',
      })) ?? currentTask;

    let execution: ExecutionResult<unknown>;
    try {
      const project = await this.projects!.getById(currentTask.projectId);
      const thread = await this.events!.findByTaskId(task.id);
      execution = await this.executions!.execute({
        agentId: assignedAgentId,
        context: {
          activePathIds: buildTreePath(currentTask.id, project.tasks),
          project: {
            definitionBrief: project.definitionBrief,
            id: project.id,
            name: project.name,
            sourceBrief: project.sourceBrief,
            workingDirectory: project.workingDirectory,
          },
          task: {
            ...currentTask,
            instruction: input.instruction,
          },
          thread,
        },
        operationKey: 'execute-task',
        sandboxMode: input.sandboxMode,
        userInput: input.instruction,
        workingDirectory: input.workingDirectory ?? project.workingDirectory,
      });
    } catch (error) {
      const message = errorToMessage(error);
      await this.repository.update(task.id, {
        completedAt: null,
        status: 'failed',
      });
      await this.events!.create({
        authorAgentId: input.authorAgentId,
        body: `Execution failed before the agent submitted a response: ${message}`,
        kind: 'status_changed',
        metadata: {
          error: message,
          nextStatus: 'failed',
          reviewCycle: currentTask.reviewCycle,
          statusBeforeRun: input.statusBeforeRun,
        },
        taskId: task.id,
      });
      throw error;
    }

    await this.repository.update(task.id, {
      completedAt: null,
      hasDependencyRisk: false,
      lastExecutionId: execution.id,
      status: 'awaiting_review',
    });

    await this.events!.create({
      authorAgentId: assignedAgentId,
      body: execution.rawOutput,
      executionId: execution.id,
      kind: 'agent_reply',
      metadata: { operationKey: execution.operationKey, reviewCycle: currentTask.reviewCycle },
      taskId: task.id,
    });

    await this.events!.create({
      authorAgentId: assignedAgentId,
      body: 'Submitted work for CEO review.',
      executionId: execution.id,
      kind: 'submission',
      metadata: { reviewCycle: currentTask.reviewCycle },
      taskId: task.id,
    });

    const updatedTask = await this.getById(task.id);
    return {
      execution,
      task: updatedTask,
      thread: await this.events!.findByTaskId(task.id),
    };
  }

  private async flagDependencyRisk(
    taskId: number,
    authorAgentId: number,
    hasDependencyRisk: boolean,
  ): Promise<void> {
    const dependents = await this.repository.findDependents(taskId);

    if (dependents.length === 0) {
      return;
    }

    await this.repository.setDependencyRisk(
      dependents.map((dependent) => dependent.id),
      hasDependencyRisk,
    );

    if (!hasDependencyRisk) {
      return;
    }

    await Promise.all(
      dependents.map((dependent) =>
        this.events!.create({
          authorAgentId,
          body: `Dependency risk flagged because upstream task #${taskId} re-entered review.`,
          kind: 'dependency_risk_flagged',
          metadata: { sourceTaskId: taskId },
          taskId: dependent.id,
        }),
      ),
    );
  }
}
