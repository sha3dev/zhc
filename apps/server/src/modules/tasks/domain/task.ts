import { z } from 'zod';

export const taskStatuses = [
  'pending',
  'in_progress',
  'waiting',
  'completed',
  'failed',
  'cancelled',
] as const;

export const taskStatusSchema = z.enum(taskStatuses);
export type TaskStatus = z.infer<typeof taskStatusSchema>;

export interface Task {
  assignedToAgentId: number | null;
  assignedToAgentName: string | null;
  canRun: boolean;
  createdAt: Date;
  dependsOnTaskIds: number[];
  description: string;
  hasDependencyRisk: boolean;
  id: number;
  lastExecutionId: number | null;
  projectId: number;
  reviewCycle: number;
  runBlockedReason: string | null;
  sort: number;
  status: TaskStatus;
  title: string;
  completedAt: Date | null;
  updatedAt: Date;
}

export interface TaskRecord {
  actor_id: number | null;
  agent_name?: string | null;
  exe_id: number | null;
  prj_id: number;
  tsk_completed_at: Date | null;
  tsk_created_at: Date;
  tsk_description: string;
  tsk_has_dependency_risk: boolean;
  tsk_id: number;
  tsk_review_cycle: number;
  tsk_sort: number;
  tsk_status: TaskStatus;
  tsk_title: string;
  tsk_updated_at: Date;
}

export interface TaskDependencyRecord {
  depends_on_tsk_id: number;
  tsk_id: number;
}
