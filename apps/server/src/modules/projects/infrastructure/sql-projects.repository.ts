import { query } from '../../../shared/db/client.js';
import {
  getColumnName,
  getPrimaryKeyColumn,
  getTimestampColumn,
} from '../../../shared/db/naming.js';
import type {
  CreateProjectInput,
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
    description: getColumnName(this.tableName, 'description'),
    id: getPrimaryKeyColumn(this.tableName),
    name: getColumnName(this.tableName, 'name'),
    ownerAgentId: 'agn_id',
    slug: getColumnName(this.tableName, 'slug'),
    status: getColumnName(this.tableName, 'status'),
    updatedAt: getTimestampColumn(this.tableName, 'updated_at'),
  };

  async assignOwner(projectId: number, agentId: number): Promise<Project | null> {
    const result = await query<ProjectRecord>(
      `
        UPDATE ${this.tableName}
        SET ${this.columns.ownerAgentId} = $1,
            ${this.columns.updatedAt} = CURRENT_TIMESTAMP
        WHERE ${this.columns.id} = $2
        RETURNING *
      `,
      [agentId, projectId],
    );

    return result.rows[0] ? toProject(result.rows[0]) : null;
  }

  async create(input: CreateProjectInput): Promise<Project> {
    const result = await query<ProjectRecord>(
      `
        INSERT INTO ${this.tableName} (
          ${this.columns.name},
          ${this.columns.slug},
          ${this.columns.description},
          ${this.columns.createdBy},
          ${this.columns.status}
        ) VALUES ($1, $2, $3, $4, 'draft')
        RETURNING *
      `,
      [input.name, input.slug ?? createSlug(input.name), input.description, input.createdBy],
    );

    return toProject(result.rows[0]!);
  }

  async delete(projectId: number): Promise<boolean> {
    const result = await query(`DELETE FROM ${this.tableName} WHERE ${this.columns.id} = $1`, [
      projectId,
    ]);
    return (result.rowCount ?? 0) > 0;
  }

  async findAll(filters: ListProjectsQuery): Promise<{ projects: Project[]; total: number }> {
    const clauses: string[] = [];
    const params: Array<number | string> = [];
    let index = 1;

    if (filters.slug) {
      clauses.push(`${this.columns.slug} = $${index++}`);
      params.push(filters.slug);
    }

    if (filters.status) {
      clauses.push(`${this.columns.status} = $${index++}`);
      params.push(filters.status);
    }

    if (filters.createdBy) {
      clauses.push(`${this.columns.createdBy} = $${index++}`);
      params.push(filters.createdBy);
    }

    if (filters.search) {
      clauses.push(
        `(${this.columns.name} ILIKE $${index++} OR ${this.columns.description} ILIKE $${index++})`,
      );
      params.push(`%${filters.search}%`, `%${filters.search}%`);
    }

    const whereClause = clauses.length > 0 ? `WHERE ${clauses.join(' AND ')}` : '';

    const countResult = await query<{ total: string }>(
      `SELECT COUNT(*)::text AS total FROM ${this.tableName} ${whereClause}`,
      params,
    );

    const dataResult = await query<ProjectRecord>(
      `
        SELECT *
        FROM ${this.tableName}
        ${whereClause}
        ORDER BY ${this.columns.createdAt} DESC
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
      `SELECT * FROM ${this.tableName} WHERE ${this.columns.id} = $1`,
      [id],
    );

    return result.rows[0] ? toProject(result.rows[0]) : null;
  }

  async findBySlug(slug: string): Promise<Project | null> {
    const result = await query<ProjectRecord>(
      `SELECT * FROM ${this.tableName} WHERE ${this.columns.slug} = $1`,
      [slug],
    );

    return result.rows[0] ? toProject(result.rows[0]) : null;
  }

  async update(projectId: number, input: UpdateProjectInput): Promise<Project | null> {
    const updates: string[] = [];
    const params: Array<number | string> = [];
    let index = 1;

    if (input.name !== undefined) {
      updates.push(`${this.columns.name} = $${index++}`);
      params.push(input.name);
    }

    if (input.slug !== undefined) {
      updates.push(`${this.columns.slug} = $${index++}`);
      params.push(input.slug);
    }

    if (input.description !== undefined) {
      updates.push(`${this.columns.description} = $${index++}`);
      params.push(input.description);
    }

    if (input.status !== undefined) {
      updates.push(`${this.columns.status} = $${index++}`);
      params.push(input.status);
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
        RETURNING *
      `,
      [...params, projectId],
    );

    return result.rows[0] ? toProject(result.rows[0]) : null;
  }

  updateStatus(projectId: number, status: Project['status']): Promise<Project | null> {
    return this.update(projectId, { status });
  }
}
