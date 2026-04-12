import { z } from 'zod';

export const taskEventKinds = [
  'run_request',
  'agent_response',
  'ceo_response',
  'human_feedback_request',
  'human_feedback',
  'status_changed',
] as const;

export const taskEventKindSchema = z.enum(taskEventKinds);
export type TaskEventKind = z.infer<typeof taskEventKindSchema>;

export const taskEventAttachmentKindSchema = z.enum(['project_file', 'external_url']);
export type TaskEventAttachmentKind = z.infer<typeof taskEventAttachmentKindSchema>;

export interface TaskEventAttachment {
  id: number;
  kind: TaskEventAttachmentKind;
  mediaType: string | null;
  path: string | null;
  sizeBytes: number | null;
  taskEventId: number;
  title: string;
  url: string | null;
}

export interface TaskEvent {
  attachments: TaskEventAttachment[];
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
  task_event_attachments_json: TaskEventAttachmentRecord[] | null;
  tev_body: string;
  tev_created_at: Date;
  tev_id: number;
  tev_kind: TaskEventKind;
  tev_metadata_json: Record<string, unknown> | null;
  tsk_id: number;
}

export interface TaskEventAttachmentRecord {
  tea_id: number;
  tea_kind: TaskEventAttachmentKind;
  tea_media_type: string | null;
  tea_path: string | null;
  tea_size_bytes: number | null;
  tea_title: string;
  tea_url: string | null;
  tev_id: number;
}
