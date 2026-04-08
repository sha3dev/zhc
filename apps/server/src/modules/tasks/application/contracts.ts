import { z } from 'zod';
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

export const listTasksQuerySchema = z.object({
  assignedToAgentId: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().positive().max(100).default(50),
  offset: z.coerce.number().int().min(0).default(0),
  projectId: z.coerce.number().int().positive().optional(),
  status: taskStatusSchema.optional(),
});

export type CreateTaskInput = z.infer<typeof createTaskInputSchema>;
export type ListTasksQuery = z.infer<typeof listTasksQuerySchema>;

export interface TasksRepository {
  assign(taskId: number, agentId: number): Promise<Task | null>;
  canStart(taskId: number): Promise<boolean>;
  create(input: CreateTaskInput): Promise<Task>;
  findAll(query: ListTasksQuery): Promise<{ tasks: Task[]; total: number }>;
  findById(id: number): Promise<Task | null>;
  findByProjectId(projectId: number): Promise<Task[]>;
  getNextPendingTasks(projectId: number): Promise<Task[]>;
  updateStatus(taskId: number, status: Task['status']): Promise<Task | null>;
}
