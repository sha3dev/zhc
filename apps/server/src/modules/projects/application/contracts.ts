import { z } from 'zod';
import type { AgentStatus } from '../../agents/domain/agent.js';
import type { RegistryEntityMemorySummary } from '../../agents/domain/expert.js';
import type { ExecutionResult } from '../../executions/domain/execution.js';
import type { CreateTaskInput, Task } from '../../tasks/index.js';
import { type Project, type ProjectDetails, projectStatusSchema } from '../domain/project.js';
import type { CreateProjectOperationOutput } from './operations.js';

export const createProjectInputSchema = z.object({
  brief: z.string().trim().min(1),
  createdBy: z.string().trim().min(1).max(255).optional().default('system'),
});

export const updateProjectInputSchema = z
  .object({
    definitionBrief: z.string().trim().min(1).optional(),
    name: z.string().trim().min(1).max(255).optional(),
    ownerAgentId: z.number().int().positive().nullable().optional(),
    planningExecutionId: z.number().int().positive().nullable().optional(),
    sourceBrief: z.string().trim().min(1).optional(),
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

export type CreateProjectInput = z.infer<typeof createProjectInputSchema>;
export type UpdateProjectInput = z.infer<typeof updateProjectInputSchema>;
export type ListProjectsQuery = z.infer<typeof listProjectsQuerySchema>;

export interface CreateStoredProjectInput {
  createdBy: string;
  definitionBrief: string;
  name: string;
  ownerAgentId: number | null;
  planningExecutionId: number | null;
  slug: string;
  sourceBrief: string;
  status?: Project['status'];
}

export interface ProjectPlanningAgent {
  id: number;
  key: string;
  kind: RegistryEntityMemorySummary['kind'];
  name: string;
  status: AgentStatus;
}

export interface ProjectPlanningAgentLookup {
  findCeo(): Promise<{ id: number; status: AgentStatus } | null>;
  listForMemory(): Promise<RegistryEntityMemorySummary[]>;
}

export interface ProjectPlanner {
  execute(input: {
    agentId: number;
    operationKey: 'create-project';
    userInput: string;
    workingDirectory: string;
  }): Promise<ExecutionResult<CreateProjectOperationOutput>>;
}

export interface ProjectsRepository {
  assignOwner(projectId: number, agentId: number): Promise<Project | null>;
  create(input: CreateStoredProjectInput): Promise<Project>;
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

export interface ProjectCreationResult extends ProjectDetails {
  planningExecutionId: number | null;
}
