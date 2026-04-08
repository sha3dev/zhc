import type { Project, ProjectRecord } from '../domain/project.js';

export function toProject(record: ProjectRecord): Project {
  return {
    createdAt: record.prj_created_at,
    createdBy: record.prj_created_by,
    description: record.prj_description,
    id: record.prj_id,
    name: record.prj_name,
    ownerAgentId: record.agn_id,
    slug: record.prj_slug,
    status: record.prj_status,
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
