import { z } from 'zod';
import type { TaskEvent } from '../domain/task-event.js';
import { type Task, taskStatusSchema } from '../domain/task.js';

export const createTaskInputSchema = z.object({
  assignedToAgentId: z.number().int().positive().nullable().optional(),
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

export const taskReplyInputSchema = taskAuthorSchema.extend({
  body: z.string().trim().min(1),
  kind: z
    .enum(['ceo_instruction', 'agent_reply', 'submission', 'changes_requested', 'blocked'])
    .optional()
    .default('ceo_instruction'),
  markAsSubmission: z.boolean().optional().default(false),
});

export const taskDispatchInputSchema = taskAuthorSchema.extend({
  agentId: z.number().int().positive().optional(),
  instruction: z.string().trim().min(1).optional(),
  sandboxMode: z.enum(['read-only', 'workspace-write', 'danger-full-access']).optional(),
  workingDirectory: z.string().trim().min(1).optional(),
});

export const taskApproveInputSchema = taskAuthorSchema.extend({
  body: z.string().trim().min(1).optional().default('Approved by CEO.'),
});

export const taskRequestChangesInputSchema = taskAuthorSchema.extend({
  body: z.string().trim().min(1),
  sandboxMode: z.enum(['read-only', 'workspace-write', 'danger-full-access']).optional(),
  workingDirectory: z.string().trim().min(1).optional(),
});

export const taskReopenInputSchema = taskAuthorSchema.extend({
  body: z.string().trim().min(1),
  instruction: z.string().trim().min(1).optional(),
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
export type TaskReplyInput = z.infer<typeof taskReplyInputSchema>;
export type TaskDispatchInput = z.infer<typeof taskDispatchInputSchema>;
export type TaskApproveInput = z.infer<typeof taskApproveInputSchema>;
export type TaskRequestChangesInput = z.infer<typeof taskRequestChangesInputSchema>;
export type TaskReopenInput = z.infer<typeof taskReopenInputSchema>;

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
  authorAgentId: number;
  body: string;
  executionId?: number | null;
  kind: TaskEvent['kind'];
  metadata?: Record<string, unknown> | null;
  taskId: number;
}

export interface TaskEventsRepository {
  create(input: CreateTaskEventInput): Promise<TaskEvent>;
  findByTaskId(taskId: number): Promise<TaskEvent[]>;
}

export interface UpdateTaskInput {
  completedAt?: Date | null;
  hasDependencyRisk?: boolean;
  lastExecutionId?: number | null;
  reopenedAt?: Date | null;
  reopenedFromTaskEventId?: number | null;
  reopenCount?: number;
  reviewCycle?: number;
  status?: Task['status'];
}
