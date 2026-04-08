import { z } from 'zod';

export const taskStatuses = [
  'pending',
  'assigned',
  'in_progress',
  'completed',
  'failed',
  'blocked',
  'cancelled',
] as const;

export const taskStatusSchema = z.enum(taskStatuses);
export type TaskStatus = z.infer<typeof taskStatusSchema>;

export interface Task {
  assignedToAgentId: number | null;
  createdAt: Date;
  dependsOnTaskIds: number[];
  description: string;
  id: number;
  projectId: number;
  sort: number;
  status: TaskStatus;
  title: string;
  updatedAt: Date;
}

export interface TaskRecord {
  agn_id: number | null;
  prj_id: number;
  tsk_created_at: Date;
  tsk_description: string;
  tsk_id: number;
  tsk_sort: number;
  tsk_status: TaskStatus;
  tsk_title: string;
  tsk_updated_at: Date;
}

export interface TaskDependencyRecord {
  depends_on_tsk_id: number;
  tsk_id: number;
}
