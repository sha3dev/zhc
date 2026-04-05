/**
 * Agent Repository
 *
 * Handles all database operations for the Agent entity.
 * Uses database naming utilities for consistent column naming.
 */

import {
  getColumnName,
  getForeignKeyColumn,
  getPrimaryKeyColumn,
  getTimestampColumn,
  query,
} from '../db/index.js';
import type {
  Agent,
  AgentEntity,
  AgentHierarchyNode,
  AgentQueryParams,
  AgentStats,
  CreateAgentDTO,
  UpdateAgentDTO,
} from '../types/agent.js';

/**
 * Convert database entity to domain model
 */
function entityToAgent(entity: AgentEntity): Agent {
  return {
    id: entity.AGN_id,
    name: entity.AGN_name,
    soul: entity.AGN_soul,
    model: entity.AGN_model,
    status: entity.AGN_status,
    reportsTo: undefined, // Will be populated if needed
    manages: [], // Will be populated if needed
    createdAt: entity.AGN_created_at,
    updatedAt: entity.AGN_updated_at,
  };
}

/**
 * Agent Repository
 */
export class AgentRepository {
  private readonly tableName = 'agent';
  private readonly columns = {
    id: getPrimaryKeyColumn(this.tableName), // agn_id
    name: getColumnName(this.tableName, 'name'), // agn_name
    soul: getColumnName(this.tableName, 'soul'), // agn_soul
    model: getColumnName(this.tableName, 'model'), // agn_model
    reportsToId: getForeignKeyColumn(this.tableName, this.tableName, 'reports_to'), // agn_reports_to_agn_id
    status: getColumnName(this.tableName, 'status'), // agn_status
    createdAt: getTimestampColumn(this.tableName, 'created_at'), // agn_created_at
    updatedAt: getTimestampColumn(this.tableName, 'updated_at'), // agn_updated_at
  };

  /**
   * Create a new agent
   */
  async create(dto: CreateAgentDTO): Promise<Agent> {
    const sql = `
      INSERT INTO ${this.tableName} (
        ${this.columns.name},
        ${this.columns.soul},
        ${this.columns.model},
        ${this.columns.reportsToId},
        ${this.columns.status}
      ) VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `;

    const params = [dto.name, dto.soul, dto.model, dto.reportsToId ?? null, dto.status ?? 'active'];

    const result = await query<AgentEntity>(sql, params);
    if (result.rows.length === 0) {
      throw new Error('Failed to create agent');
    }
    return entityToAgent(result.rows[0]!);
  }

  /**
   * Find agent by ID
   */
  async findById(id: number): Promise<Agent | null> {
    const sql = `
      SELECT * FROM ${this.tableName}
      WHERE ${this.columns.id} = $1
    `;

    const result = await query<AgentEntity>(sql, [id]);

    if (result.rows.length === 0) {
      return null;
    }

    return entityToAgent(result.rows[0]!);
  }

  /**
   * Find agent by ID with full hierarchy information
   */
  async findByIdWithHierarchy(id: number): Promise<Agent | null> {
    const sql = `
      SELECT * FROM ${this.tableName}
      WHERE ${this.columns.id} = $1
    `;

    const result = await query<AgentEntity>(sql, [id]);

    if (result.rows.length === 0) {
      return null;
    }

    const entity = result.rows[0]!;
    const agent = entityToAgent(entity);

    // Load parent if exists
    if (entity.reports_to_AGN_id) {
      const parent = await this.findById(entity.reports_to_AGN_id);
      agent.reportsTo = parent ?? undefined;
    }

    // Load children
    const children = await this.findByReportsToId(id);
    agent.manages = children;

    return agent;
  }

  /**
   * Find all agents with optional filtering
   */
  async findAll(params: AgentQueryParams = {}): Promise<{ agents: Agent[]; total: number }> {
    const { status, model, reportsToId, search, offset = 0, limit = 20 } = params;

    const conditions: string[] = [];
    const queryParams: (string | number | null)[] = [];
    let paramIndex = 1;

    if (status) {
      conditions.push(`${this.columns.status} = $${paramIndex++}`);
      queryParams.push(status);
    }

    if (model) {
      conditions.push(`${this.columns.model} = $${paramIndex++}`);
      queryParams.push(model);
    }

    if (reportsToId !== undefined) {
      if (reportsToId === null) {
        conditions.push(`${this.columns.reportsToId} IS NULL`);
      } else {
        conditions.push(`${this.columns.reportsToId} = $${paramIndex++}`);
        queryParams.push(reportsToId);
      }
    }

    if (search) {
      conditions.push(
        `(${this.columns.name} ILIKE $${paramIndex++} OR ${this.columns.soul} ILIKE $${paramIndex++})`,
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
      ORDER BY ${this.columns.name}
      LIMIT $${paramIndex++} OFFSET $${paramIndex++}
    `;

    queryParams.push(limit, offset);

    const dataResult = await query<AgentEntity>(dataSql, queryParams);
    const agents = dataResult.rows.map(entityToAgent);

    return { agents, total };
  }

  /**
   * Find agents that report to a specific agent
   */
  async findByReportsToId(reportsToId: number): Promise<Agent[]> {
    const sql = `
      SELECT * FROM ${this.tableName}
      WHERE ${this.columns.reportsToId} = $1
      ORDER BY ${this.columns.name}
    `;

    const result = await query<AgentEntity>(sql, [reportsToId]);
    return result.rows.map(entityToAgent);
  }

  /**
   * Find all top-level agents (no parent)
   */
  async findTopLevelAgents(): Promise<Agent[]> {
    const sql = `
      SELECT * FROM ${this.tableName}
      WHERE ${this.columns.reportsToId} IS NULL
      ORDER BY ${this.columns.name}
    `;

    const result = await query<AgentEntity>(sql);
    return result.rows.map(entityToAgent);
  }

  /**
   * Update an agent
   */
  async update(id: number, dto: UpdateAgentDTO): Promise<Agent | null> {
    const updates: string[] = [];
    const params: (string | number | null)[] = [];
    let paramIndex = 1;

    if (dto.name !== undefined) {
      updates.push(`${this.columns.name} = $${paramIndex++}`);
      params.push(dto.name);
    }

    if (dto.soul !== undefined) {
      updates.push(`${this.columns.soul} = $${paramIndex++}`);
      params.push(dto.soul);
    }

    if (dto.model !== undefined) {
      updates.push(`${this.columns.model} = $${paramIndex++}`);
      params.push(dto.model);
    }

    if (dto.reportsToId !== undefined) {
      updates.push(`${this.columns.reportsToId} = $${paramIndex++}`);
      params.push(dto.reportsToId);
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

    const result = await query<AgentEntity>(sql, params);

    if (result.rows.length === 0) {
      return null;
    }

    return entityToAgent(result.rows[0]!);
  }

  /**
   * Delete an agent (soft delete by setting status to archived)
   */
  async delete(id: number): Promise<boolean> {
    const sql = `
      UPDATE ${this.tableName}
      SET ${this.columns.status} = 'archived',
          ${this.columns.updatedAt} = CURRENT_TIMESTAMP
      WHERE ${this.columns.id} = $1
    `;

    const result = await query(sql, [id]);
    return (result.rowCount ?? 0) > 0;
  }

  /**
   * Permanently delete an agent
   */
  async hardDelete(id: number): Promise<boolean> {
    const sql = `DELETE FROM ${this.tableName} WHERE ${this.columns.id} = $1`;

    const result = await query(sql, [id]);
    return (result.rowCount ?? 0) > 0;
  }

  /**
   * Get agent hierarchy as a tree
   */
  async getHierarchy(): Promise<AgentHierarchyNode[]> {
    // Get all top-level agents
    const topLevelAgents = await this.findTopLevelAgents();

    // Recursively build hierarchy
    const buildHierarchy = async (agentId: number): Promise<AgentHierarchyNode> => {
      const agent = await this.findById(agentId);
      if (!agent) {
        throw new Error(`Agent ${agentId} not found`);
      }

      const children = await this.findByReportsToId(agentId);
      const childrenNodes = await Promise.all(children.map((child) => buildHierarchy(child.id)));

      return {
        id: agent.id,
        name: agent.name,
        role: this.extractRoleFromSoul(agent.soul),
        status: agent.status,
        children: childrenNodes,
      };
    };

    return Promise.all(topLevelAgents.map((agent) => buildHierarchy(agent.id)));
  }

  /**
   * Get agent statistics
   */
  async getStats(): Promise<AgentStats> {
    const sql = `
      SELECT
        COUNT(*) as total_agents,
        COUNT(*) FILTER (WHERE ${this.columns.model} = 'claude-opus-4-6') as claude_opus,
        COUNT(*) FILTER (WHERE ${this.columns.model} = 'claude-sonnet-4-6') as claude_sonnet,
        COUNT(*) FILTER (WHERE ${this.columns.model} = 'claude-haiku-4-5') as claude_haiku,
        COUNT(*) FILTER (WHERE ${this.columns.model} = 'gpt-4') as gpt_4,
        COUNT(*) FILTER (WHERE ${this.columns.model} = 'gpt-4-turbo') as gpt_4_turbo,
        COUNT(*) FILTER (WHERE ${this.columns.model} = 'gpt-4o') as gpt_4o,
        COUNT(*) FILTER (WHERE ${this.columns.status} = 'active') as active,
        COUNT(*) FILTER (WHERE ${this.columns.status} = 'inactive') as inactive,
        COUNT(*) FILTER (WHERE ${this.columns.status} = 'archived') as archived,
        COUNT(*) FILTER (WHERE ${this.columns.reportsToId} IS NULL) as top_level
      FROM ${this.tableName}
    `;

    const result = await query(sql);
    const row = result.rows[0];

    if (!row) {
      return {
        totalAgents: 0,
        agentsByModel: {
          'claude-opus-4-6': 0,
          'claude-sonnet-4-6': 0,
          'claude-haiku-4-5': 0,
          'gpt-4': 0,
          'gpt-4-turbo': 0,
          'gpt-4o': 0,
          'o1-preview': 0,
          'o1-mini': 0,
          'deepseek-chat': 0,
          'deepseek-coder': 0,
        },
        agentsByStatus: {
          active: 0,
          inactive: 0,
          archived: 0,
        },
        topLevelAgents: 0,
        maxDepth: 0,
      };
    }

    return {
      totalAgents: Number(row['total_agents']),
      agentsByModel: {
        'claude-opus-4-6': Number(row['claude_opus']),
        'claude-sonnet-4-6': Number(row['claude_sonnet']),
        'claude-haiku-4-5': Number(row['claude_haiku']),
        'gpt-4': Number(row['gpt_4']),
        'gpt-4-turbo': Number(row['gpt_4_turbo']),
        'gpt-4o': Number(row['gpt_4o']),
        'o1-preview': 0,
        'o1-mini': 0,
        'deepseek-chat': 0,
        'deepseek-coder': 0,
      },
      agentsByStatus: {
        active: Number(row['active']),
        inactive: Number(row['inactive']),
        archived: Number(row['archived']),
      },
      topLevelAgents: Number(row['top_level']),
      maxDepth: await this.calculateMaxDepth(),
    };
  }

  /**
   * Calculate maximum hierarchy depth
   */
  private async calculateMaxDepth(): Promise<number> {
    const sql = `
      WITH RECURSIVE hierarchy AS (
        SELECT ${this.columns.id}, ${this.columns.reportsToId}, 1 as depth
        FROM ${this.tableName}
        WHERE ${this.columns.reportsToId} IS NULL

        UNION ALL

        SELECT a.${this.columns.id}, a.${this.columns.reportsToId}, h.depth + 1
        FROM ${this.tableName} a
        INNER JOIN hierarchy h ON a.${this.columns.reportsToId} = h.${this.columns.id}
      )
      SELECT MAX(depth) as max_depth FROM hierarchy
    `;

    const result = await query<{ max_depth: number }>(sql);
    return result.rows[0]?.max_depth ?? 0;
  }

  /**
   * Extract role from soul (simple heuristic)
   */
  private extractRoleFromSoul(soul: string): string | undefined {
    const roleMatch = soul.match(/#+\s*Role\s*\n+(.+)/i);
    return roleMatch?.[1]?.trim();
  }
}

// Export singleton instance
export const agentRepository = new AgentRepository();
