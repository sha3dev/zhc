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
  | 'assigned'
  | 'in_progress'
  | 'awaiting_review'
  | 'changes_requested'
  | 'reopened'
  | 'completed'
  | 'failed'
  | 'blocked'
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
  reopenCount: number;
  reopenedAt: string | null;
  reopenedFromTaskEventId: number | null;
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
  authorAgentId: number;
  authorAgentName: string;
  body: string;
  createdAt: string;
  executionId: number | null;
  id: number;
  kind:
    | 'assignment'
    | 'ceo_instruction'
    | 'agent_reply'
    | 'submission'
    | 'approval'
    | 'changes_requested'
    | 'reopened'
    | 'blocked'
    | 'status_changed'
    | 'dependency_risk_flagged';
  metadata: Record<string, unknown> | null;
  taskId: number;
}

export interface ListProjectsResponse {
  items: ProjectSummary[];
  total: number;
  limit: number;
  offset: number;
}
