import { query } from '../../../shared/db/client.js';
import {
  getColumnName,
  getPrimaryKeyColumn,
  getTimestampColumn,
} from '../../../shared/db/naming.js';
import { ConflictError } from '../../../shared/errors/app-error.js';
import type {
  AgentsRepository,
  CreateAgentInput,
  ListAgentsQuery,
  UpdateAgentInput,
} from '../application/contracts.js';
import type {
  Agent,
  AgentDetails,
  AgentHierarchyNode,
  AgentMemorySummary,
  AgentRecord,
  AgentStats,
} from '../domain/agent.js';
import { agentStatuses } from '../domain/agent.js';
import { extractRoleFromDefinition, toAgent, toAgentSummary } from './mappers.js';

export class SqlAgentsRepository implements AgentsRepository {
  private readonly tableName = 'agent';

  private readonly columns = {
    createdAt: getTimestampColumn(this.tableName, 'created_at'),
    id: getPrimaryKeyColumn(this.tableName),
    isCeo: getColumnName(this.tableName, 'is_ceo'),
    kind: getColumnName(this.tableName, 'kind'),
    key: getColumnName(this.tableName, 'key'),
    modelCli: getColumnName(this.tableName, 'model_cli'),
    model: getColumnName(this.tableName, 'model'),
    name: getColumnName(this.tableName, 'name'),
    subagentMd: getColumnName(this.tableName, 'subagent_md'),
    status: getColumnName(this.tableName, 'status'),
    updatedAt: getTimestampColumn(this.tableName, 'updated_at'),
  };

  private createKey(name: string): string {
    return name
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }

  async count(): Promise<number> {
    const result = await query<{ total: string }>(
      `SELECT COUNT(*)::text AS total FROM ${this.tableName}`,
    );

    return Number(result.rows[0]?.total ?? 0);
  }

  async archive(id: number): Promise<boolean> {
    const agent = await this.findById(id);

    if (agent?.isCeo) {
      throw new ConflictError('Cannot delete the CEO agent');
    }

    const result = await query(`DELETE FROM ${this.tableName} WHERE ${this.columns.id} = $1`, [id]);

    return (result.rowCount ?? 0) > 0;
  }

  async create(input: CreateAgentInput): Promise<Agent> {
    const result = await query<AgentRecord>(
      `
        INSERT INTO ${this.tableName} (
          ${this.columns.name},
          ${this.columns.subagentMd},
          ${this.columns.key},
          ${this.columns.isCeo},
          ${this.columns.kind},
          ${this.columns.modelCli},
          ${this.columns.model},
          ${this.columns.status}
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING *
      `,
      [
        input.name,
        input.subagentMd,
        input.key ?? this.createKey(input.name),
        input.isCeo ?? false,
        input.kind,
        input.modelCliId,
        input.model,
        input.status,
      ],
    );

    return toAgent(result.rows[0]!);
  }

  async findAll(filters: ListAgentsQuery): Promise<{ agents: Agent[]; total: number }> {
    const clauses: string[] = [];
    const params: Array<number | string | string[]> = [];
    let index = 1;

    if (filters.model) {
      clauses.push(`${this.columns.model} = $${index++}`);
      params.push(filters.model);
    }

    if (filters.status) {
      clauses.push(`${this.columns.status} = $${index++}`);
      params.push(filters.status);
    }

    if (filters.kinds && filters.kinds.length > 0) {
      clauses.push(`${this.columns.kind} = ANY($${index++}::text[])`);
      params.push(filters.kinds);
    }

    if (filters.search) {
      clauses.push(
        `(${this.columns.name} ILIKE $${index++} OR ${this.columns.subagentMd} ILIKE $${index++})`,
      );
      params.push(`%${filters.search}%`, `%${filters.search}%`);
    }

    const whereClause = clauses.length > 0 ? `WHERE ${clauses.join(' AND ')}` : '';

    const countResult = await query<{ total: string }>(
      `SELECT COUNT(*)::text AS total FROM ${this.tableName} ${whereClause}`,
      params,
    );

    const dataResult = await query<AgentRecord>(
      `
        SELECT *
        FROM ${this.tableName}
        ${whereClause}
        ORDER BY ${this.columns.name} ASC
        LIMIT $${index++}
        OFFSET $${index++}
      `,
      [...params, filters.limit, filters.offset],
    );

    return {
      agents: dataResult.rows.map(toAgent),
      total: Number(countResult.rows[0]?.total ?? 0),
    };
  }

  async findById(id: number): Promise<Agent | null> {
    const result = await query<AgentRecord>(
      `SELECT * FROM ${this.tableName} WHERE ${this.columns.id} = $1`,
      [id],
    );

    return result.rows[0] ? toAgent(result.rows[0]) : null;
  }

  async findCeo(): Promise<Agent | null> {
    const result = await query<AgentRecord>(
      `SELECT * FROM ${this.tableName} WHERE ${this.columns.kind} = 'ceo' LIMIT 1`,
    );

    return result.rows[0] ? toAgent(result.rows[0]) : null;
  }

  async findByIdWithRelations(id: number): Promise<AgentDetails | null> {
    const agent = await this.findById(id);

    if (!agent) {
      return null;
    }

    const childrenResult = agent.isCeo
      ? await query<AgentRecord>(
          `
            SELECT *
            FROM ${this.tableName}
            WHERE ${this.columns.kind} = 'specialist'
            ORDER BY ${this.columns.name} ASC
          `,
        )
      : { rows: [] as AgentRecord[] };

    return {
      ...agent,
      manages: childrenResult.rows.map((child) => toAgentSummary(toAgent(child))),
    };
  }

  async findForMemory(): Promise<AgentMemorySummary[]> {
    const result = await query<AgentRecord>(
      `
        SELECT *
        FROM ${this.tableName}
        WHERE ${this.columns.status} <> 'suspended'
        ORDER BY ${this.columns.name} ASC
      `,
    );

    return result.rows.map((row) => {
      const agent = toAgent(row);
      return {
        id: agent.id,
        isCeo: agent.isCeo,
        kind: agent.kind,
        key: agent.key,
        modelCliId: agent.modelCliId,
        model: agent.model,
        name: agent.name,
        role: extractRoleFromDefinition(agent.subagentMd),
        status: agent.status,
      };
    });
  }

  async getHierarchy(): Promise<AgentHierarchyNode[]> {
    const result = await query<AgentRecord>(
      `SELECT * FROM ${this.tableName} ORDER BY ${this.columns.name} ASC`,
    );
    const agents = result.rows.map(toAgent);
    const ceo = agents.find((agent) => agent.isCeo);

    const buildNode = (agent: Agent, children: Agent[] = []): AgentHierarchyNode => ({
      children: children.map((child) => buildNode(child)),
      id: agent.id,
      kind: agent.kind,
      name: agent.name,
      role: extractRoleFromDefinition(agent.subagentMd),
      status: agent.status,
    });

    if (!ceo) {
      return agents.map((agent) => buildNode(agent));
    }

    return [
      buildNode(
        ceo,
        agents.filter((agent) => agent.kind === 'specialist'),
      ),
    ];
  }

  async getStats(): Promise<AgentStats> {
    const result = await query<AgentRecord>(
      `SELECT * FROM ${this.tableName} ORDER BY ${this.columns.name} ASC`,
    );
    const agents = result.rows.map(toAgent);

    const agentsByKind = {
      ceo: 0,
      specialist: 0,
    } as AgentStats['agentsByKind'];
    const agentsByModel: Record<string, number> = {};
    const agentsByStatus = Object.fromEntries(
      agentStatuses.map((status) => [status, 0]),
    ) as AgentStats['agentsByStatus'];

    for (const agent of agents) {
      agentsByKind[agent.kind] += 1;
      if (agent.model && agent.modelCliId) {
        const key = `${agent.modelCliId}:${agent.model}`;
        agentsByModel[key] = (agentsByModel[key] ?? 0) + 1;
      }
      agentsByStatus[agent.status] += 1;
    }

    const ceo = agents.find((agent) => agent.isCeo);
    const topLevelAgents = ceo ? [ceo] : agents;
    const maxDepth = ceo ? (agents.length > 1 ? 2 : 1) : topLevelAgents.length > 0 ? 1 : 0;

    return {
      agentsByKind,
      agentsByModel,
      agentsByStatus,
      maxDepth,
      topLevelAgents: topLevelAgents.length,
      totalAgents: agents.length,
    };
  }

  async update(id: number, input: UpdateAgentInput): Promise<Agent | null> {
    const updates: string[] = [];
    const params: Array<number | string | null> = [];
    let index = 1;

    if (input.name !== undefined) {
      updates.push(`${this.columns.name} = $${index++}`);
      params.push(input.name);
    }

    if (input.subagentMd !== undefined) {
      updates.push(`${this.columns.subagentMd} = $${index++}`);
      params.push(input.subagentMd);
    }

    if (input.kind !== undefined) {
      updates.push(`${this.columns.kind} = $${index++}`);
      params.push(input.kind);
    }

    if (input.model !== undefined) {
      updates.push(`${this.columns.model} = $${index++}`);
      params.push(input.model);
    }

    if (input.modelCliId !== undefined) {
      updates.push(`${this.columns.modelCli} = $${index++}`);
      params.push(input.modelCliId);
    }

    if (input.status !== undefined) {
      updates.push(`${this.columns.status} = $${index++}`);
      params.push(input.status);
    }

    if (updates.length === 0) {
      return this.findById(id);
    }

    params.push(id);

    const result = await query<AgentRecord>(
      `
        UPDATE ${this.tableName}
        SET ${updates.join(', ')},
            ${this.columns.updatedAt} = CURRENT_TIMESTAMP
        WHERE ${this.columns.id} = $${index}
        RETURNING *
      `,
      params,
    );

    return result.rows[0] ? toAgent(result.rows[0]) : null;
  }
}
