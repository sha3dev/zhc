import type { Task, TaskRecord } from '../domain/task.js';

export function toTask(record: TaskRecord, dependsOnTaskIds: number[] = []): Task {
  return {
    assignedToAgentId: record.agn_id,
    createdAt: record.tsk_created_at,
    dependsOnTaskIds,
    description: record.tsk_description,
    id: record.tsk_id,
    projectId: record.prj_id,
    sort: record.tsk_sort,
    status: record.tsk_status,
    title: record.tsk_title,
    updatedAt: record.tsk_updated_at,
  };
}
