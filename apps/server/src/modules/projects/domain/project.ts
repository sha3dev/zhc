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
  createdAt: Date;
  createdBy: string;
  description: string;
  id: number;
  name: string;
  ownerAgentId: number | null;
  slug: string;
  status: ProjectStatus;
  updatedAt: Date;
}

export interface ProjectDetails extends Project {
  tasks: Task[];
}

export interface ProjectRecord {
  agn_id: number | null;
  prj_created_at: Date;
  prj_created_by: string;
  prj_description: string;
  prj_id: number;
  prj_name: string;
  prj_slug: string;
  prj_status: ProjectStatus;
  prj_updated_at: Date;
}
