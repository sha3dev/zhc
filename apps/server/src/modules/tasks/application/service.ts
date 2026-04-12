import { readFile, stat } from 'node:fs/promises';
import { basename, extname, resolve } from 'node:path';
import { NotFoundError, ValidationError } from '../../../shared/errors/app-error.js';
import { logger } from '../../../shared/observability/logger.js';
import type { ConfigurationReader } from '../../configuration/index.js';
import type { ExecutionResult } from '../../executions/domain/execution.js';
import type { SendEmailInput } from '../../mails/application/contracts.js';
import type { TaskEvent } from '../domain/task-event.js';
import type { Task } from '../domain/task.js';
import type {
  CreateTaskInput,
  TaskAgentResponse,
  TaskApproveInput,
  TaskDenyInput,
  TaskEventsRepository,
  TaskFeedbackInput,
  TaskHumanFeedbackRequestInput,
  TaskEventAttachmentInput,
  TaskRunInput,
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
  }): Promise<ExecutionResult<TaskAgentResponse>>;
}

interface TaskEmailSender {
  send(input: SendEmailInput): Promise<unknown>;
}

type TaskRunState = {
  canRun: boolean;
  runBlockedReason: string | null;
};

const RUNNABLE_TASK_STATUSES = new Set<Task['status']>(['pending', 'failed']);

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

function defaultRunInstruction(task: Task): string {
  return [
    `Run task: ${task.title}.`,
    'Use the task brief, project context, and thread history as the source of truth.',
    'Return a structured agent response with either a CEO feedback request or a CEO approval request.',
  ].join(' ');
}

function errorToMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  return String(error);
}

function guessMediaType(path: string): string {
  switch (extname(path).toLowerCase()) {
    case '.gif':
      return 'image/gif';
    case '.jpeg':
    case '.jpg':
      return 'image/jpeg';
    case '.json':
      return 'application/json; charset=utf-8';
    case '.md':
      return 'text/markdown; charset=utf-8';
    case '.pdf':
      return 'application/pdf';
    case '.png':
      return 'image/png';
    case '.svg':
      return 'image/svg+xml';
    case '.txt':
      return 'text/plain; charset=utf-8';
    case '.webp':
      return 'image/webp';
    default:
      return 'application/octet-stream';
  }
}

function getTaskRunState(task: Task, dependenciesCompleted: boolean): TaskRunState {
  if (!task.assignedToAgentId) {
    return {
      canRun: false,
      runBlockedReason: 'Task must have an assigned agent or expert.',
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
    private readonly configuration?: ConfigurationReader,
    private readonly emails?: TaskEmailSender,
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

  async getAttachmentContent(taskId: number, attachmentId: number): Promise<{
    content: Buffer;
    contentDisposition: string;
    contentType: string;
  }> {
    await this.getById(taskId);
    this.ensureWorkflowDependencies();

    const task = await this.getRawTaskById(taskId);
    const attachment = await this.events!.findAttachment(taskId, attachmentId);

    if (!attachment) {
      throw new NotFoundError(`Attachment ${attachmentId} not found for task ${taskId}`);
    }

    if (attachment.kind !== 'project_file' || !attachment.path) {
      throw new ValidationError('Only project_file attachments can be streamed from the API');
    }

    const project = await this.projects!.getById(task.projectId);
    const absolutePath = resolve(project.workingDirectory, attachment.path);

    if (!absolutePath.startsWith(project.workingDirectory)) {
      throw new ValidationError(`Unsafe attachment path: ${attachment.path}`);
    }

    const fileStat = await stat(absolutePath);
    if (!fileStat.isFile()) {
      throw new NotFoundError(`Attachment file does not exist: ${attachment.path}`);
    }

    return {
      content: await readFile(absolutePath),
      contentDisposition: `inline; filename="${basename(attachment.path)}"`,
      contentType: attachment.mediaType ?? guessMediaType(attachment.path),
    };
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
    input: TaskRunInput,
  ): Promise<{
    execution: ExecutionResult<TaskAgentResponse>;
    task: Task;
    thread: TaskEvent[];
  }> {
    this.ensureWorkflowDependencies();

    const task = await this.getRawTaskById(taskId);
    const author = await this.agents!.getById(input.authorAgentId);
    if (!author.isCeo) {
      throw new ValidationError('Only the CEO can run a task');
    }
    logger.info('Task run requested', {
      author: author.name,
      taskId,
      taskStatus: task.status,
      title: task.title,
    });

    const instruction = input.instruction?.trim() || defaultRunInstruction(task);
    return this.executeTaskCycle(task, {
      authorAgentId: author.id,
      instruction,
      runRequestMetadata: {
        reviewCycle: task.reviewCycle,
        statusBeforeRun: task.status,
      },
      sandboxMode: input.sandboxMode,
      statusBeforeRun: task.status,
      workingDirectory: input.workingDirectory,
    });
  }

  async provideFeedback(
    taskId: number,
    input: TaskFeedbackInput,
  ): Promise<{
    execution: ExecutionResult<TaskAgentResponse>;
    task: Task;
    thread: TaskEvent[];
  }> {
    this.ensureWorkflowDependencies();
    const task = await this.getRawTaskById(taskId);
    const author = await this.requireCeo(input.authorAgentId, 'provide feedback');
    logger.info('CEO feedback requested rerun', {
      author: author.name,
      taskId,
      taskStatus: task.status,
      title: task.title,
    });

    if (task.status !== 'waiting') {
      throw new ValidationError('CEO feedback is only available while the task is waiting');
    }

    const nextReviewCycle = task.reviewCycle + 1;
    const updated =
      (await this.repository.update(taskId, {
        completedAt: null,
        hasDependencyRisk: false,
        reviewCycle: nextReviewCycle,
        status: 'pending',
      })) ?? task;

    await this.events!.create({
      attachments: await this.prepareAttachments(task.projectId, input.attachments),
      authorAgentId: author.id,
      body: input.body,
      kind: 'ceo_response',
      metadata: {
        responseType: 'feedback',
        reviewCycle: nextReviewCycle,
      },
      taskId,
    });

    return this.executeTaskCycle(updated, {
      authorAgentId: author.id,
      instruction: input.body,
      runRequestMetadata: {
        reviewCycle: nextReviewCycle,
        trigger: 'ceo_feedback',
      },
      sandboxMode: input.sandboxMode,
      statusBeforeRun: task.status,
      workingDirectory: input.workingDirectory,
    });
  }

  async deny(
    taskId: number,
    input: TaskDenyInput,
  ): Promise<{
    execution: ExecutionResult<TaskAgentResponse>;
    task: Task;
    thread: TaskEvent[];
  }> {
    this.ensureWorkflowDependencies();
    const task = await this.getRawTaskById(taskId);
    const author = await this.requireCeo(input.authorAgentId, 'deny a task');
    logger.warn('CEO denied task output', {
      author: author.name,
      taskId,
      taskStatus: task.status,
      title: task.title,
    });

    if (task.status !== 'waiting') {
      throw new ValidationError('CEO denial is only available while the task is waiting');
    }

    const nextReviewCycle = task.reviewCycle + 1;
    const updated =
      (await this.repository.update(taskId, {
        completedAt: null,
        hasDependencyRisk: false,
        reviewCycle: nextReviewCycle,
        status: 'pending',
      })) ?? task;

    await this.events!.create({
      attachments: await this.prepareAttachments(task.projectId, input.attachments),
      authorAgentId: author.id,
      body: input.body,
      kind: 'ceo_response',
      metadata: {
        responseType: 'denied',
        reviewCycle: nextReviewCycle,
      },
      taskId,
    });

    return this.executeTaskCycle(updated, {
      authorAgentId: author.id,
      instruction: input.body,
      runRequestMetadata: {
        reviewCycle: nextReviewCycle,
        trigger: 'ceo_denied',
      },
      sandboxMode: input.sandboxMode,
      statusBeforeRun: task.status,
      workingDirectory: input.workingDirectory,
    });
  }

  async approve(taskId: number, input: TaskApproveInput): Promise<Task> {
    this.ensureWorkflowDependencies();
    const task = await this.getRawTaskById(taskId);
    const author = await this.requireCeo(input.authorAgentId, 'approve a task');
    logger.info('CEO approved task', {
      author: author.name,
      reviewCycle: task.reviewCycle,
      taskId,
      title: task.title,
    });

    if (task.status !== 'waiting') {
      throw new ValidationError('Only waiting tasks can be approved');
    }

    await this.events!.create({
      attachments: await this.prepareAttachments(task.projectId, input.attachments),
      authorAgentId: author.id,
      body: input.body,
      kind: 'ceo_response',
      metadata: { responseType: 'approved', reviewCycle: task.reviewCycle },
      taskId,
    });

    const updated = await this.repository.update(taskId, {
      completedAt: new Date(),
      hasDependencyRisk: false,
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

  async requestHumanFeedback(taskId: number, input: TaskHumanFeedbackRequestInput): Promise<Task> {
    this.ensureWorkflowDependencies();

    if (!this.configuration || !this.emails) {
      throw new ValidationError('Human feedback email dependencies are not configured');
    }

    const task = await this.getRawTaskById(taskId);
    const author = await this.requireCeo(input.authorAgentId, 'request human feedback');
    logger.warn('Human feedback requested', {
      author: author.name,
      taskId,
      title: task.title,
    });

    if (task.status !== 'waiting') {
      throw new ValidationError('Human feedback can only be requested while the task is waiting');
    }

    const config = await this.configuration.get();
    const recipient = config.human.email?.trim() ?? '';
    if (!recipient) {
      throw new ValidationError('Human email is not configured');
    }

    const event = await this.events!.create({
      attachments: await this.prepareAttachments(task.projectId, input.attachments),
      authorAgentId: author.id,
      body: input.body,
      kind: 'human_feedback_request',
      metadata: {
        requestedBy: author.id,
      },
      taskId,
    });

    const token = `TASK-${taskId}-EVENT-${event.id}`;

    await this.emails.send({
      agentId: author.id,
      subject: `[Task ${taskId}] Human feedback requested`,
      text: [
        `Task: ${task.title}`,
        `Token: ${token}`,
        '',
        'The CEO requested additional human input before proceeding.',
        '',
        input.body,
        '',
        `Reply with the token ${token} in the subject or body when inbound processing is implemented.`,
      ].join('\n'),
      to: [recipient],
    });
    logger.info('Human feedback email sent', {
      recipient,
      taskId,
      token,
    });

    return this.decorateTask(task);
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

  private async requireCeo(authorAgentId: number, action: string) {
    const author = await this.agents!.getById(authorAgentId);

    if (!author.isCeo) {
      throw new ValidationError(`Only the CEO can ${action}`);
    }

    return author;
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
      authorAgentId: number;
      instruction: string;
      runRequestMetadata?: Record<string, unknown>;
      sandboxMode?: 'read-only' | 'workspace-write' | 'danger-full-access';
      statusBeforeRun: Task['status'];
      workingDirectory?: string;
    },
  ): Promise<{
    execution: ExecutionResult<TaskAgentResponse>;
    task: Task;
    thread: TaskEvent[];
  }> {
    const { canRun, runBlockedReason } = await this.decorateTask(task);
    const assignedAgentId = task.assignedToAgentId;

    if (!assignedAgentId) {
      throw new ValidationError(`Task ${task.id} has no assigned agent`);
    }

    if (!canRun) {
      throw new ValidationError(runBlockedReason ?? `Task ${task.id} cannot run`);
    }

    await this.events!.create({
      authorAgentId: input.authorAgentId,
      body: input.instruction,
      kind: 'run_request',
      metadata: input.runRequestMetadata ?? null,
      taskId: task.id,
    });
    logger.info('Task entered in_progress', {
      actorId: assignedAgentId,
      taskId: task.id,
      title: task.title,
    });

    const currentTask =
      (await this.repository.update(task.id, {
        completedAt: null,
        hasDependencyRisk: false,
        status: 'in_progress',
      })) ?? task;

    let execution: ExecutionResult<TaskAgentResponse>;
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
      logger.error('Task execution failed before response', {
        actorId: assignedAgentId,
        error: message,
        taskId: task.id,
        title: task.title,
      });
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
          statusBeforeRun: input.statusBeforeRun,
        },
        taskId: task.id,
      });
      throw error;
    }

    if (!execution.parsedOutput) {
      const message = execution.validationError ?? 'Task execution returned invalid structured output';
      logger.error('Task execution returned invalid agent output', {
        actorId: assignedAgentId,
        executionId: execution.id,
        taskId: task.id,
        title: task.title,
        validationError: message,
      });
      await this.repository.update(task.id, {
        completedAt: null,
        lastExecutionId: execution.id,
        status: 'failed',
      });
      await this.events!.create({
        authorAgentId: input.authorAgentId,
        body: `Execution failed validation: ${message}`,
        executionId: execution.id,
        kind: 'status_changed',
        metadata: {
          error: message,
          nextStatus: 'failed',
          rawOutput: execution.rawOutput,
        },
        taskId: task.id,
      });
      throw new ValidationError(message);
    }

    await this.repository.update(task.id, {
      completedAt: null,
      hasDependencyRisk: false,
      lastExecutionId: execution.id,
      status: 'waiting',
    });

    await this.events!.create({
      attachments: await this.prepareAttachments(currentTask.projectId, execution.parsedOutput.attachments),
      authorAgentId: assignedAgentId,
      body: execution.parsedOutput.body,
      executionId: execution.id,
      kind: 'agent_response',
      metadata: {
        responseType: execution.parsedOutput.responseType,
        reviewCycle: currentTask.reviewCycle,
        summary: execution.parsedOutput.summary ?? null,
      },
      taskId: task.id,
    });
    logger.info('Task waiting for CEO', {
      actorId: assignedAgentId,
      executionId: execution.id,
      responseType: execution.parsedOutput.responseType,
      summary: execution.parsedOutput.summary ?? null,
      taskId: task.id,
      title: task.title,
    });

    const updatedTask = await this.getById(task.id);
    return {
      execution,
      task: updatedTask,
      thread: await this.events!.findByTaskId(task.id),
    };
  }

  private async prepareAttachments(
    projectId: number,
    attachments: TaskEventAttachmentInput[] | undefined,
  ): Promise<TaskEventAttachmentInput[] | null> {
    if (!attachments || attachments.length === 0) {
      return null;
    }

    const project = await this.projects!.getById(projectId);
    const prepared: TaskEventAttachmentInput[] = [];

    for (const attachment of attachments) {
      if (attachment.kind === 'external_url') {
        prepared.push({
          kind: 'external_url',
          mediaType: attachment.mediaType ?? null,
          title: attachment.title,
          url: attachment.url,
        });
        continue;
      }

      const absolutePath = resolve(project.workingDirectory, attachment.path);
      if (!absolutePath.startsWith(project.workingDirectory)) {
        throw new ValidationError(`Unsafe attachment path: ${attachment.path}`);
      }

      const fileStat = await stat(absolutePath);
      if (!fileStat.isFile()) {
        throw new ValidationError(`Attachment file does not exist: ${attachment.path}`);
      }

      prepared.push({
        kind: 'project_file',
        mediaType: attachment.mediaType ?? guessMediaType(attachment.path),
        path: attachment.path,
        title: attachment.title,
      });
    }

    return prepared;
  }
}
