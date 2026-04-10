import { query } from '../../../shared/db/client.js';
import {
  getColumnName,
  getPrimaryKeyColumn,
  getTimestampColumn,
} from '../../../shared/db/naming.js';
import type {
  CreateExpertInput,
  ExpertsRepository,
  ListExpertsQuery,
  UpdateExpertInput,
} from '../application/experts-contracts.js';
import type {
  Expert,
  ExpertDetails,
  ExpertRecord,
  RegistryEntityMemorySummary,
  RuntimeActor,
} from '../domain/expert.js';
import { toExpert, toExpertMemorySummary, toExpertRuntimeActor } from './experts-mappers.js';

export class SqlExpertsRepository implements ExpertsRepository {
  private readonly tableName = 'expert';

  private readonly columns = {
    createdAt: getTimestampColumn(this.tableName, 'created_at'),
    id: getPrimaryKeyColumn(this.tableName),
    key: getColumnName(this.tableName, 'key'),
    name: getColumnName(this.tableName, 'name'),
    subagentMd: getColumnName(this.tableName, 'subagent_md'),
    updatedAt: getTimestampColumn(this.tableName, 'updated_at'),
  };

  private createKey(name: string): string {
    return name
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }

  async archive(id: number): Promise<boolean> {
    const result = await query(`DELETE FROM ${this.tableName} WHERE ${this.columns.id} = $1`, [id]);
    return (result.rowCount ?? 0) > 0;
  }

  async create(input: CreateExpertInput): Promise<Expert> {
    const result = await query<ExpertRecord>(
      `
        INSERT INTO ${this.tableName} (
          ${this.columns.name},
          ${this.columns.subagentMd},
          ${this.columns.key}
        ) VALUES ($1, $2, $3)
        RETURNING *
      `,
      [input.name, input.subagentMd, input.key ?? this.createKey(input.name)],
    );

    return toExpert(result.rows[0]!);
  }

  async findAll(queryInput: ListExpertsQuery): Promise<{ experts: Expert[]; total: number }> {
    const clauses: string[] = [];
    const params: Array<number | string> = [];
    let index = 1;

    if (queryInput.search) {
      clauses.push(
        `(${this.columns.name} ILIKE $${index++} OR ${this.columns.subagentMd} ILIKE $${index++})`,
      );
      params.push(`%${queryInput.search}%`, `%${queryInput.search}%`);
    }

    const whereClause = clauses.length > 0 ? `WHERE ${clauses.join(' AND ')}` : '';
    const countResult = await query<{ total: string }>(
      `SELECT COUNT(*)::text AS total FROM ${this.tableName} ${whereClause}`,
      params,
    );
    const dataResult = await query<ExpertRecord>(
      `
        SELECT *
        FROM ${this.tableName}
        ${whereClause}
        ORDER BY ${this.columns.name} ASC
        LIMIT $${index++}
        OFFSET $${index++}
      `,
      [...params, queryInput.limit, queryInput.offset],
    );

    return {
      experts: dataResult.rows.map(toExpert),
      total: Number(countResult.rows[0]?.total ?? 0),
    };
  }

  async findById(id: number): Promise<Expert | null> {
    const result = await query<ExpertRecord>(
      `SELECT * FROM ${this.tableName} WHERE ${this.columns.id} = $1`,
      [id],
    );
    return result.rows[0] ? toExpert(result.rows[0]) : null;
  }

  async findByIdWithRelations(id: number): Promise<ExpertDetails | null> {
    const expert = await this.findById(id);
    return expert ? { ...expert, manages: [] } : null;
  }

  async findForMemory(ceo: RuntimeActor | null): Promise<RegistryEntityMemorySummary[]> {
    const result = await query<ExpertRecord>(
      `SELECT * FROM ${this.tableName} ORDER BY ${this.columns.name} ASC`,
    );
    return result.rows.map((row) => toExpertMemorySummary(toExpert(row), ceo));
  }

  async findRuntimeActorById(id: number, ceo: RuntimeActor | null): Promise<RuntimeActor | null> {
    const expert = await this.findById(id);
    return expert ? toExpertRuntimeActor(expert, ceo) : null;
  }

  async update(id: number, input: UpdateExpertInput): Promise<Expert | null> {
    const updates: string[] = [];
    const params: Array<number | string> = [];
    let index = 1;

    if (input.name !== undefined) {
      updates.push(`${this.columns.name} = $${index++}`);
      params.push(input.name);
    }

    if (input.subagentMd !== undefined) {
      updates.push(`${this.columns.subagentMd} = $${index++}`);
      params.push(input.subagentMd);
    }

    if (updates.length === 0) {
      return this.findById(id);
    }

    params.push(id);

    const result = await query<ExpertRecord>(
      `
        UPDATE ${this.tableName}
        SET ${updates.join(', ')},
            ${this.columns.updatedAt} = CURRENT_TIMESTAMP
        WHERE ${this.columns.id} = $${index}
        RETURNING *
      `,
      params,
    );

    return result.rows[0] ? toExpert(result.rows[0]) : null;
  }
}
