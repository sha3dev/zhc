/**
 * Project Repository
 *
 * Handles all database operations for the Project entity.
 * Uses database naming utilities for consistent column naming.
 */

import { getColumnName, getPrimaryKeyColumn, getTimestampColumn, query } from '../db/index.js';
import type {
  CreateProjectDTO,
  Project,
  ProjectEntity,
  ProjectQueryParams,
  UpdateProjectDTO,
} from '../types/project.js';

/**
 * Convert database entity to domain model
 */
function entityToProject(entity: ProjectEntity): Project {
  return {
    id: entity.PRJ_id,
    name: entity.PRJ_name,
    slug: entity.PRJ_slug,
    description: entity.PRJ_description,
    status: entity.PRJ_status,
    createdBy: entity.PRJ_created_by,
    ceo: undefined, // Will be populated if needed
    tasks: [], // Will be populated if needed
    createdAt: entity.PRJ_created_at,
    updatedAt: entity.PRJ_updated_at,
  };
}

/**
 * Project Repository
 */
export class ProjectRepository {
  private readonly tableName = 'project';
  private readonly columns = {
    id: getPrimaryKeyColumn(this.tableName), // PRJ_id
    name: getColumnName(this.tableName, 'name'), // PRJ_name
    slug: getColumnName(this.tableName, 'slug'), // PRJ_slug
    description: getColumnName(this.tableName, 'description'), // PRJ_description
    status: getColumnName(this.tableName, 'status'), // PRJ_status
    createdBy: getColumnName(this.tableName, 'created_by'), // PRJ_created_by
    ceoAgentId: 'AGN_id', // AGN_id (FK to agent)
    createdAt: getTimestampColumn(this.tableName, 'created_at'), // PRJ_created_at
    updatedAt: getTimestampColumn(this.tableName, 'updated_at'), // PRJ_updated_at
  };

  /**
   * Create a new project
   */
  async create(dto: CreateProjectDTO): Promise<Project> {
    // Generate slug from name if not provided
    const slug = dto.slug ?? this.generateSlug(dto.name);

    const sql = `
      INSERT INTO ${this.tableName} (
        ${this.columns.name},
        ${this.columns.slug},
        ${this.columns.description},
        ${this.columns.createdBy},
        ${this.columns.status}
      ) VALUES ($1, $2, $3, $4, 'draft')
      RETURNING *
    `;

    const params = [dto.name, slug, dto.description, dto.createdBy];

    const result = await query<ProjectEntity>(sql, params);
    if (result.rows.length === 0) {
      throw new Error('Failed to create project');
    }
    return entityToProject(result.rows[0]!);
  }

  /**
   * Find project by ID
   */
  async findById(id: number): Promise<Project | null> {
    const sql = `
      SELECT * FROM ${this.tableName}
      WHERE ${this.columns.id} = $1
    `;

    const result = await query<ProjectEntity>(sql, [id]);

    if (result.rows.length === 0) {
      return null;
    }

    return entityToProject(result.rows[0]!);
  }

  /**
   * Find project by ID with full relations
   */
  async findByIdWithRelations(id: number): Promise<Project | null> {
    const sql = `
      SELECT * FROM ${this.tableName}
      WHERE ${this.columns.id} = $1
    `;

    const result = await query<ProjectEntity>(sql, [id]);

    if (result.rows.length === 0) {
      return null;
    }

    const entity = result.rows[0]!;
    const project = entityToProject(entity);

    // Load CEO agent if exists
    if (entity.AGN_id) {
      const agentSql = `
        SELECT AGN_id, AGN_name
        FROM agent
        WHERE AGN_id = $1
      `;
      const agentResult = await query<{ AGN_id: number; AGN_name: string }>(agentSql, [
        entity.AGN_id,
      ]);
      if (agentResult.rows.length > 0) {
        project.ceo = {
          id: agentResult.rows[0]!.AGN_id,
          name: agentResult.rows[0]!.AGN_name,
        };
      }
    }

    return project;
  }

  /**
   * Find all projects with optional filtering
   */
  async findAll(params: ProjectQueryParams = {}): Promise<{ projects: Project[]; total: number }> {
    const { slug, status, createdBy, search, offset = 0, limit = 20 } = params;

    const conditions: string[] = [];
    const queryParams: (string | number | null)[] = [];
    let paramIndex = 1;

    if (slug) {
      conditions.push(`${this.columns.slug} = $${paramIndex++}`);
      queryParams.push(slug);
    }

    if (status) {
      conditions.push(`${this.columns.status} = $${paramIndex++}`);
      queryParams.push(status);
    }

    if (createdBy) {
      conditions.push(`${this.columns.createdBy} = $${paramIndex++}`);
      queryParams.push(createdBy);
    }

    if (search) {
      conditions.push(
        `(${this.columns.name} ILIKE $${paramIndex++} OR ${this.columns.description} ILIKE $${paramIndex++})`,
      );
      queryParams.push(`%${search}%`, `%${search}%`);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    // Get total count
    const countSql = `
      SELECT COUNT(*) as total
      FROM ${this.tableName}
      ${whereClause}
    `;

    const countResult = await query<{ total: bigint }>(countSql, queryParams);
    const total = Number(countResult.rows[0]?.total ?? 0);

    // Get paginated results
    const dataSql = `
      SELECT * FROM ${this.tableName}
      ${whereClause}
      ORDER BY ${this.columns.createdAt} DESC
      LIMIT $${paramIndex++} OFFSET $${paramIndex++}
    `;

    queryParams.push(limit, offset);

    const dataResult = await query<ProjectEntity>(dataSql, queryParams);
    const projects = dataResult.rows.map(entityToProject);

    return { projects, total };
  }

  /**
   * Update a project
   */
  async update(id: number, dto: UpdateProjectDTO): Promise<Project | null> {
    const updates: string[] = [];
    const params: (string | number | null)[] = [];
    let paramIndex = 1;

    if (dto.name !== undefined) {
      updates.push(`${this.columns.name} = $${paramIndex++}`);
      params.push(dto.name);
    }

    if (dto.slug !== undefined) {
      updates.push(`${this.columns.slug} = $${paramIndex++}`);
      params.push(dto.slug);
    }

    if (dto.description !== undefined) {
      updates.push(`${this.columns.description} = $${paramIndex++}`);
      params.push(dto.description);
    }

    if (dto.status !== undefined) {
      updates.push(`${this.columns.status} = $${paramIndex++}`);
      params.push(dto.status);
    }

    if (updates.length === 0) {
      return this.findById(id);
    }

    // Always update updated_at
    updates.push(`${this.columns.updatedAt} = CURRENT_TIMESTAMP`);

    params.push(id);

    const sql = `
      UPDATE ${this.tableName}
      SET ${updates.join(', ')}
      WHERE ${this.columns.id} = $${paramIndex}
      RETURNING *
    `;

    const result = await query<ProjectEntity>(sql, params);

    if (result.rows.length === 0) {
      return null;
    }

    return entityToProject(result.rows[0]!);
  }

  /**
   * Assign CEO agent to project
   */
  async assignCEO(projectId: number, agentId: number): Promise<Project | null> {
    const sql = `
      UPDATE ${this.tableName}
      SET ${this.columns.ceoAgentId} = $1,
          ${this.columns.updatedAt} = CURRENT_TIMESTAMP
      WHERE ${this.columns.id} = $2
      RETURNING *
    `;

    const result = await query<ProjectEntity>(sql, [agentId, projectId]);

    if (result.rows.length === 0) {
      return null;
    }

    return entityToProject(result.rows[0]!);
  }

  /**
   * Delete a project (hard delete)
   */
  async delete(id: number): Promise<boolean> {
    const sql = `DELETE FROM ${this.tableName} WHERE ${this.columns.id} = $1`;

    const result = await query(sql, [id]);
    return (result.rowCount ?? 0) > 0;
  }

  /**
   * Update project status
   */
  async updateStatus(id: number, status: ProjectEntity['PRJ_status']): Promise<Project | null> {
    return this.update(id, { status });
  }

  /**
   * Find project by slug
   */
  async findBySlug(slug: string): Promise<Project | null> {
    const sql = `
      SELECT * FROM ${this.tableName}
      WHERE ${this.columns.slug} = $1
    `;

    const result = await query<ProjectEntity>(sql, [slug]);

    if (result.rows.length === 0) {
      return null;
    }

    return entityToProject(result.rows[0]!);
  }

  /**
   * Generate URL-friendly slug from project name
   */
  private generateSlug(name: string): string {
    return name
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, '') // Remove special characters
      .replace(/[\s_-]+/g, '-') // Replace spaces and underscores with hyphens
      .replace(/^-+|-+$/g, ''); // Remove leading/trailing hyphens
  }
}

// Export singleton instance
export const projectRepository = new ProjectRepository();
