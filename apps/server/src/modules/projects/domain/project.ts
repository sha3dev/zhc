import { z } from 'zod';
import type { Task } from '../../tasks/domain/task.js';

export const projectStatuses = [
  'draft',
  'planning',
  'ready',
  'in_progress',
  'completed',
  'on_hold',
  'cancelled',
] as const;

export const projectStatusSchema = z.enum(projectStatuses);
export type ProjectStatus = z.infer<typeof projectStatusSchema>;

export interface Project {
  completedTaskCount: number;
  createdAt: Date;
  createdBy: string;
  definitionBrief: string;
  id: number;
  name: string;
  ownerAgentId: number | null;
  ownerAgentName: string | null;
  planningExecutionId: number | null;
  slug: string;
  sourceBrief: string;
  status: ProjectStatus;
  taskCount: number;
  updatedAt: Date;
}

export interface ProjectDetails extends Project {
  activePathIds: number[];
  activeTaskId: number | null;
  artifacts: ProjectArtifact[];
  tasks: Task[];
  workingDirectory: string;
}

export interface ProjectArtifact {
  path: string;
  title: string;
}

export interface ProjectRecord {
  agn_id: number | null;
  completed_task_count?: string | number;
  exe_id: number | null;
  owner_agent_name?: string | null;
  prj_created_at: Date;
  prj_created_by: string;
  prj_definition_brief: string;
  prj_id: number;
  prj_name: string;
  prj_slug: string;
  prj_source_brief: string;
  prj_status: ProjectStatus;
  task_count?: string | number;
  prj_updated_at: Date;
}
