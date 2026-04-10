import type { TaskEvent, TaskEventRecord } from '../domain/task-event.js';
import type { Task, TaskRecord } from '../domain/task.js';

export function toTask(record: TaskRecord, dependsOnTaskIds: number[] = []): Task {
  return {
    assignedToAgentId: record.actor_id,
    assignedToAgentName: record.agent_name ?? null,
    canRun: false,
    completedAt: record.tsk_completed_at,
    createdAt: record.tsk_created_at,
    dependsOnTaskIds,
    description: record.tsk_description,
    hasDependencyRisk: record.tsk_has_dependency_risk,
    id: record.tsk_id,
    lastExecutionId: record.exe_id,
    projectId: record.prj_id,
    reopenCount: record.tsk_reopen_count,
    reopenedAt: record.tsk_reopened_at,
    reopenedFromTaskEventId: record.tsk_reopened_from_tev_id,
    reviewCycle: record.tsk_review_cycle,
    runBlockedReason: null,
    sort: record.tsk_sort,
    status: record.tsk_status,
    title: record.tsk_title,
    updatedAt: record.tsk_updated_at,
  };
}

export function toTaskEvent(record: TaskEventRecord): TaskEvent {
  return {
    authorAgentId: record.actor_id,
    authorAgentName: record.agent_name,
    body: record.tev_body,
    createdAt: record.tev_created_at,
    executionId: record.exe_id,
    id: record.tev_id,
    kind: record.tev_kind,
    metadata: record.tev_metadata_json,
    taskId: record.tsk_id,
  };
}
