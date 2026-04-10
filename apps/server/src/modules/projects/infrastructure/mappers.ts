import type { Project, ProjectRecord } from '../domain/project.js';

export function toProject(record: ProjectRecord): Project {
  return {
    completedTaskCount: Number(record.completed_task_count ?? 0),
    createdAt: record.prj_created_at,
    createdBy: record.prj_created_by,
    definitionBrief: record.prj_definition_brief,
    id: record.prj_id,
    name: record.prj_name,
    ownerAgentId: record.agn_id,
    ownerAgentName: record.owner_agent_name ?? null,
    planningExecutionId: record.exe_id,
    slug: record.prj_slug,
    sourceBrief: record.prj_source_brief,
    status: record.prj_status,
    taskCount: Number(record.task_count ?? 0),
    updatedAt: record.prj_updated_at,
  };
}

export function createSlug(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}
