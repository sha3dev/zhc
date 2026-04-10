import { z } from 'zod';

export const taskEventKinds = [
  'assignment',
  'ceo_instruction',
  'agent_reply',
  'submission',
  'approval',
  'changes_requested',
  'reopened',
  'blocked',
  'status_changed',
  'dependency_risk_flagged',
] as const;

export const taskEventKindSchema = z.enum(taskEventKinds);
export type TaskEventKind = z.infer<typeof taskEventKindSchema>;

export interface TaskEvent {
  authorAgentId: number;
  authorAgentName: string;
  body: string;
  createdAt: Date;
  executionId: number | null;
  id: number;
  kind: TaskEventKind;
  metadata: Record<string, unknown> | null;
  taskId: number;
}

export interface TaskEventRecord {
  agent_name: string;
  actor_id: number;
  exe_id: number | null;
  tev_body: string;
  tev_created_at: Date;
  tev_id: number;
  tev_kind: TaskEventKind;
  tev_metadata_json: Record<string, unknown> | null;
  tsk_id: number;
}
