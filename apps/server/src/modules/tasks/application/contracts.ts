import { z } from 'zod';
import type { TaskEvent } from '../domain/task-event.js';
import { type Task, taskStatusSchema } from '../domain/task.js';

const taskAttachmentTitleSchema = z.string().trim().min(1).max(255);

export const taskEventAttachmentInputSchema = z.discriminatedUnion('kind', [
  z.object({
    kind: z.literal('project_file'),
    mediaType: z.string().trim().min(1).max(255).nullable().optional(),
    path: z
      .string()
      .trim()
      .min(1)
      .max(1000)
      .regex(/^(?!\/)(?!.*\.\.)(?:[a-zA-Z0-9._ -]+\/)*[a-zA-Z0-9._ -]+$/),
    title: taskAttachmentTitleSchema,
  }),
  z.object({
    kind: z.literal('external_url'),
    mediaType: z.string().trim().min(1).max(255).nullable().optional(),
    title: taskAttachmentTitleSchema,
    url: z.string().trim().url().max(2000),
  }),
]);

export const createTaskInputSchema = z.object({
  assignedToAgentId: z.number().int().positive(),
  dependsOnTaskIds: z.array(z.number().int().positive()).default([]),
  description: z.string().trim().min(1),
  projectId: z.number().int().positive(),
  sort: z.number().int().min(0),
  title: z.string().trim().min(1).max(500),
});

export const updateTaskStatusInputSchema = z.object({
  status: taskStatusSchema,
});

export const taskAuthorSchema = z.object({
  authorAgentId: z.number().int().positive(),
});

export const taskRunInputSchema = taskAuthorSchema.extend({
  instruction: z.string().trim().min(1).optional(),
  sandboxMode: z.enum(['read-only', 'workspace-write', 'danger-full-access']).optional(),
  workingDirectory: z.string().trim().min(1).optional(),
});

export const taskApproveInputSchema = taskAuthorSchema.extend({
  attachments: z.array(taskEventAttachmentInputSchema).max(20).optional(),
  body: z.string().trim().min(1).optional().default('Approved by CEO.'),
});

export const taskFeedbackInputSchema = taskAuthorSchema.extend({
  attachments: z.array(taskEventAttachmentInputSchema).max(20).optional(),
  body: z.string().trim().min(1),
  sandboxMode: z.enum(['read-only', 'workspace-write', 'danger-full-access']).optional(),
  workingDirectory: z.string().trim().min(1).optional(),
});

export const taskDenyInputSchema = taskAuthorSchema.extend({
  attachments: z.array(taskEventAttachmentInputSchema).max(20).optional(),
  body: z.string().trim().min(1),
  sandboxMode: z.enum(['read-only', 'workspace-write', 'danger-full-access']).optional(),
  workingDirectory: z.string().trim().min(1).optional(),
});

export const taskHumanFeedbackRequestInputSchema = taskAuthorSchema.extend({
  attachments: z.array(taskEventAttachmentInputSchema).max(20).optional(),
  body: z.string().trim().min(1),
});

export const taskAgentResponseSchema = z.object({
  attachments: z.array(taskEventAttachmentInputSchema).max(20).optional(),
  body: z.string().trim().min(1),
  responseType: z.enum(['needs_ceo_feedback', 'ready_for_approval']),
  summary: z.string().trim().min(1).optional(),
});

export const listTasksQuerySchema = z.object({
  assignedToAgentId: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().positive().max(100).default(50),
  offset: z.coerce.number().int().min(0).default(0),
  projectId: z.coerce.number().int().positive().optional(),
  status: taskStatusSchema.optional(),
});

export type CreateTaskInput = z.infer<typeof createTaskInputSchema>;
export type ListTasksQuery = z.infer<typeof listTasksQuerySchema>;
export type TaskRunInput = z.infer<typeof taskRunInputSchema>;
export type TaskApproveInput = z.infer<typeof taskApproveInputSchema>;
export type TaskFeedbackInput = z.infer<typeof taskFeedbackInputSchema>;
export type TaskDenyInput = z.infer<typeof taskDenyInputSchema>;
export type TaskHumanFeedbackRequestInput = z.infer<typeof taskHumanFeedbackRequestInputSchema>;
export type TaskAgentResponse = z.infer<typeof taskAgentResponseSchema>;
export type TaskEventAttachmentInput = z.infer<typeof taskEventAttachmentInputSchema>;

export interface TasksRepository {
  assign(taskId: number, agentId: number): Promise<Task | null>;
  canStart(taskId: number): Promise<boolean>;
  create(input: CreateTaskInput): Promise<Task>;
  findAll(query: ListTasksQuery): Promise<{ tasks: Task[]; total: number }>;
  findDependents(taskId: number): Promise<Task[]>;
  findById(id: number): Promise<Task | null>;
  findByProjectId(projectId: number): Promise<Task[]>;
  getNextPendingTasks(projectId: number): Promise<Task[]>;
  setDependencyRisk(taskIds: number[], hasDependencyRisk: boolean): Promise<void>;
  update(taskId: number, input: UpdateTaskInput): Promise<Task | null>;
  updateStatus(taskId: number, status: Task['status']): Promise<Task | null>;
}

export interface CreateTaskEventInput {
  attachments?: TaskEventAttachmentInput[] | null;
  authorAgentId: number;
  body: string;
  executionId?: number | null;
  kind: TaskEvent['kind'];
  metadata?: Record<string, unknown> | null;
  taskId: number;
}

export interface TaskEventsRepository {
  create(input: CreateTaskEventInput): Promise<TaskEvent>;
  findAttachment(taskId: number, attachmentId: number): Promise<{
    eventId: number;
    kind: TaskEventAttachmentInput['kind'];
    mediaType: string | null;
    path: string | null;
    title: string;
    url: string | null;
  } | null>;
  findByTaskId(taskId: number): Promise<TaskEvent[]>;
}

export interface UpdateTaskInput {
  completedAt?: Date | null;
  hasDependencyRisk?: boolean;
  lastExecutionId?: number | null;
  reviewCycle?: number;
  status?: Task['status'];
}
