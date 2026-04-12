export type ProjectStatus =
  | 'draft'
  | 'planning'
  | 'ready'
  | 'in_progress'
  | 'completed'
  | 'on_hold'
  | 'cancelled';

export type TaskStatus =
  | 'pending'
  | 'in_progress'
  | 'waiting'
  | 'completed'
  | 'failed'
  | 'cancelled';

export interface ProjectTask {
  assignedToAgentId: number | null;
  assignedToAgentName: string | null;
  canRun: boolean;
  completedAt: string | null;
  createdAt: string;
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
  updatedAt: string;
}

export interface ProjectArtifact {
  path: string;
  title: string;
}

export interface ProjectSummary {
  completedTaskCount: number;
  createdAt: string;
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
  updatedAt: string;
}

export interface ProjectDetails extends ProjectSummary {
  activePathIds: number[];
  activeTaskId: number | null;
  artifacts: ProjectArtifact[];
  tasks: ProjectTask[];
  workingDirectory: string;
}

export interface TaskThreadEvent {
  attachments: TaskThreadAttachment[];
  authorAgentId: number;
  authorAgentName: string;
  body: string;
  createdAt: string;
  executionId: number | null;
  id: number;
  kind:
    | 'run_request'
    | 'agent_response'
    | 'ceo_response'
    | 'human_feedback_request'
    | 'human_feedback'
    | 'status_changed';
  metadata: Record<string, unknown> | null;
  taskId: number;
}

export interface TaskThreadAttachment {
  id: number;
  kind: 'project_file' | 'external_url';
  mediaType: string | null;
  path: string | null;
  sizeBytes: number | null;
  taskEventId: number;
  title: string;
  url: string | null;
}

export interface ListProjectsResponse {
  items: ProjectSummary[];
  total: number;
  limit: number;
  offset: number;
}
