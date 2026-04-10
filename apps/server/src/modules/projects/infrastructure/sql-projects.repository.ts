import { query, transaction } from '../../../shared/db/client.js';
import {
  getColumnName,
  getPrimaryKeyColumn,
  getTimestampColumn,
} from '../../../shared/db/naming.js';
import type {
  CreateStoredProjectInput,
  ListProjectsQuery,
  ProjectsRepository,
  UpdateProjectInput,
} from '../application/contracts.js';
import type { Project, ProjectRecord } from '../domain/project.js';
import { createSlug, toProject } from './mappers.js';

export class SqlProjectsRepository implements ProjectsRepository {
  private readonly tableName = 'project';

  private readonly columns = {
    createdAt: getTimestampColumn(this.tableName, 'created_at'),
    createdBy: getColumnName(this.tableName, 'created_by'),
    definitionBrief: getColumnName(this.tableName, 'definition_brief'),
    id: getPrimaryKeyColumn(this.tableName),
    ownerAgentId: 'agn_id',
    planningExecutionId: 'exe_id',
    name: getColumnName(this.tableName, 'name'),
    slug: getColumnName(this.tableName, 'slug'),
    sourceBrief: getColumnName(this.tableName, 'source_brief'),
    status: getColumnName(this.tableName, 'status'),
    updatedAt: getTimestampColumn(this.tableName, 'updated_at'),
  };

  private readonly baseSelect = `
    SELECT project.*,
           agent.agn_name AS owner_agent_name,
           (
             SELECT COUNT(*)::text
             FROM task
             WHERE task.prj_id = project.${this.columns.id}
           ) AS task_count,
           (
             SELECT COUNT(*)::text
             FROM task
             WHERE task.prj_id = project.${this.columns.id}
               AND task.tsk_status = 'completed'
           ) AS completed_task_count
    FROM ${this.tableName} project
    LEFT JOIN agent
      ON project.${this.columns.ownerAgentId} = agent.agn_id
  `;

  async assignOwner(projectId: number, agentId: number): Promise<Project | null> {
    return this.update(projectId, { ownerAgentId: agentId });
  }

  async create(input: CreateStoredProjectInput): Promise<Project> {
    const result = await query<ProjectRecord>(
      `
        INSERT INTO ${this.tableName} (
          ${this.columns.name},
          ${this.columns.slug},
          ${this.columns.sourceBrief},
          ${this.columns.definitionBrief},
          ${this.columns.createdBy},
          ${this.columns.ownerAgentId},
          ${this.columns.planningExecutionId},
          ${this.columns.status}
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING *
      `,
      [
        input.name,
        input.slug || createSlug(input.name),
        input.sourceBrief,
        input.definitionBrief,
        input.createdBy,
        input.ownerAgentId,
        input.planningExecutionId,
        input.status ?? 'draft',
      ],
    );

    return this.enrich(result.rows[0]!.prj_id);
  }

  async delete(projectId: number): Promise<boolean> {
    return transaction(async (client) => {
      const projectResult = await client.query<{ exe_id: number | null }>(
        `
          SELECT ${this.columns.planningExecutionId} AS exe_id
          FROM ${this.tableName}
          WHERE ${this.columns.id} = $1
        `,
        [projectId],
      );

      const project = projectResult.rows[0];
      if (!project) {
        return false;
      }

      await client.query('DELETE FROM task WHERE prj_id = $1', [projectId]);

      const deleteProjectResult = await client.query(
        `DELETE FROM ${this.tableName} WHERE ${this.columns.id} = $1`,
        [projectId],
      );

      if (project.exe_id) {
        await client.query('DELETE FROM execution WHERE exe_id = $1', [project.exe_id]);
      }

      return (deleteProjectResult.rowCount ?? 0) > 0;
    });
  }

  async findAll(filters: ListProjectsQuery): Promise<{ projects: Project[]; total: number }> {
    const clauses: string[] = [];
    const params: Array<number | string> = [];
    let index = 1;

    if (filters.slug) {
      clauses.push(`project.${this.columns.slug} = $${index++}`);
      params.push(filters.slug);
    }

    if (filters.status) {
      clauses.push(`project.${this.columns.status} = $${index++}`);
      params.push(filters.status);
    }

    if (filters.createdBy) {
      clauses.push(`project.${this.columns.createdBy} = $${index++}`);
      params.push(filters.createdBy);
    }

    if (filters.search) {
      clauses.push(
        `(project.${this.columns.name} ILIKE $${index++} OR project.${this.columns.sourceBrief} ILIKE $${index++} OR project.${this.columns.definitionBrief} ILIKE $${index++})`,
      );
      params.push(`%${filters.search}%`, `%${filters.search}%`, `%${filters.search}%`);
    }

    const whereClause = clauses.length > 0 ? `WHERE ${clauses.join(' AND ')}` : '';

    const countResult = await query<{ total: string }>(
      `SELECT COUNT(*)::text AS total FROM ${this.tableName} project ${whereClause}`,
      params,
    );

    const dataResult = await query<ProjectRecord>(
      `
        ${this.baseSelect}
        ${whereClause}
        ORDER BY project.${this.columns.createdAt} DESC
        LIMIT $${index++}
        OFFSET $${index++}
      `,
      [...params, filters.limit, filters.offset],
    );

    return {
      projects: dataResult.rows.map(toProject),
      total: Number(countResult.rows[0]?.total ?? 0),
    };
  }

  async findById(id: number): Promise<Project | null> {
    const result = await query<ProjectRecord>(
      `
        ${this.baseSelect}
        WHERE project.${this.columns.id} = $1
      `,
      [id],
    );

    return result.rows[0] ? toProject(result.rows[0]) : null;
  }

  async findBySlug(slug: string): Promise<Project | null> {
    const result = await query<ProjectRecord>(
      `
        ${this.baseSelect}
        WHERE project.${this.columns.slug} = $1
      `,
      [slug],
    );

    return result.rows[0] ? toProject(result.rows[0]) : null;
  }

  async update(projectId: number, input: UpdateProjectInput): Promise<Project | null> {
    const updates: string[] = [];
    const params: Array<number | string | null> = [];
    let index = 1;

    if (input.name !== undefined) {
      updates.push(`${this.columns.name} = $${index++}`);
      params.push(input.name);
    }

    if (input.slug !== undefined) {
      updates.push(`${this.columns.slug} = $${index++}`);
      params.push(input.slug);
    }

    if (input.sourceBrief !== undefined) {
      updates.push(`${this.columns.sourceBrief} = $${index++}`);
      params.push(input.sourceBrief);
    }

    if (input.definitionBrief !== undefined) {
      updates.push(`${this.columns.definitionBrief} = $${index++}`);
      params.push(input.definitionBrief);
    }

    if (input.status !== undefined) {
      updates.push(`${this.columns.status} = $${index++}`);
      params.push(input.status);
    }

    if (input.ownerAgentId !== undefined) {
      updates.push(`${this.columns.ownerAgentId} = $${index++}`);
      params.push(input.ownerAgentId);
    }

    if (input.planningExecutionId !== undefined) {
      updates.push(`${this.columns.planningExecutionId} = $${index++}`);
      params.push(input.planningExecutionId);
    }

    if (updates.length === 0) {
      return this.findById(projectId);
    }

    const result = await query<ProjectRecord>(
      `
        UPDATE ${this.tableName}
        SET ${updates.join(', ')},
            ${this.columns.updatedAt} = CURRENT_TIMESTAMP
        WHERE ${this.columns.id} = $${index}
        RETURNING ${this.columns.id}
      `,
      [...params, projectId],
    );

    return result.rows[0] ? this.findById(result.rows[0].prj_id) : null;
  }

  updateStatus(projectId: number, status: Project['status']): Promise<Project | null> {
    return this.update(projectId, { status });
  }

  private async enrich(projectId: number): Promise<Project> {
    const project = await this.findById(projectId);

    if (!project) {
      throw new Error(`Failed to load project ${projectId} after persistence`);
    }

    return project;
  }
}
