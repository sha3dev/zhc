import { z } from 'zod';
import type { CreateTaskInput, Task } from '../../tasks/index.js';
import { type Project, projectStatusSchema } from '../domain/project.js';

export const createProjectInputSchema = z.object({
  createdBy: z.string().trim().min(1).max(255),
  description: z.string().trim().min(1),
  name: z.string().trim().min(1).max(255),
  slug: z.string().trim().min(1).max(255).optional(),
});

export const updateProjectInputSchema = z
  .object({
    description: z.string().trim().min(1).optional(),
    name: z.string().trim().min(1).max(255).optional(),
    slug: z.string().trim().min(1).max(255).optional(),
    status: projectStatusSchema.optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: 'At least one field must be provided',
  });

export const listProjectsQuerySchema = z.object({
  createdBy: z.string().trim().max(255).optional(),
  limit: z.coerce.number().int().positive().max(100).default(20),
  offset: z.coerce.number().int().min(0).default(0),
  search: z.string().trim().max(255).optional(),
  slug: z.string().trim().max(255).optional(),
  status: projectStatusSchema.optional(),
});

export const createExecutionPlanInputSchema = z.object({
  rationale: z.string().trim().min(1),
  tasks: z.array(
    z.object({
      assignedToAgentId: z.number().int().positive().nullable().optional(),
      dependsOnTaskIds: z.array(z.number().int().positive()).default([]),
      description: z.string().trim().min(1),
      sort: z.number().int().min(0),
      title: z.string().trim().min(1).max(500),
    }),
  ),
});

export type CreateProjectInput = z.infer<typeof createProjectInputSchema>;
export type UpdateProjectInput = z.infer<typeof updateProjectInputSchema>;
export type ListProjectsQuery = z.infer<typeof listProjectsQuerySchema>;
export type CreateExecutionPlanInput = z.infer<typeof createExecutionPlanInputSchema>;

export interface ProjectsRepository {
  assignOwner(projectId: number, agentId: number): Promise<Project | null>;
  create(input: CreateProjectInput): Promise<Project>;
  delete(projectId: number): Promise<boolean>;
  findAll(query: ListProjectsQuery): Promise<{ projects: Project[]; total: number }>;
  findById(id: number): Promise<Project | null>;
  findBySlug(slug: string): Promise<Project | null>;
  update(id: number, input: UpdateProjectInput): Promise<Project | null>;
  updateStatus(id: number, status: Project['status']): Promise<Project | null>;
}

export interface ProjectTasksGateway {
  create(input: CreateTaskInput): Promise<Task>;
  findByProjectId(projectId: number): Promise<Task[]>;
  getNextPendingTasks(projectId: number): Promise<Task[]>;
  updateStatus(taskId: number, status: Task['status']): Promise<Task | null>;
}
