import { query } from '../../../shared/db/client.js';
import {
  getColumnName,
  getPrimaryKeyColumn,
  getTimestampColumn,
} from '../../../shared/db/naming.js';
import type {
  ExecutionsRepository,
  ListExecutionsQuery,
} from '../application/execution-contracts.js';
import type {
  ExecutionDetails,
  ExecutionRecord,
  PersistExecutionInput,
} from '../domain/execution.js';
import { toExecutionDetails, toExecutionSummary } from './mappers.js';

export class SqlExecutionsRepository implements ExecutionsRepository {
  private readonly tableName = 'execution';

  private readonly columns = {
    agentId: 'agn_id',
    cliId: getColumnName(this.tableName, 'cli_id'),
    composedPrompt: getColumnName(this.tableName, 'composed_prompt'),
    contextJson: getColumnName(this.tableName, 'context_json'),
    createdAt: getTimestampColumn(this.tableName, 'created_at'),
    durationMs: getColumnName(this.tableName, 'duration_ms'),
    executedAt: getColumnName(this.tableName, 'executed_at'),
    id: getPrimaryKeyColumn(this.tableName),
    model: getColumnName(this.tableName, 'model'),
    operationKey: getColumnName(this.tableName, 'operation_key'),
    parsedOutputJson: getColumnName(this.tableName, 'parsed_output_json'),
    promptBlocksJson: getColumnName(this.tableName, 'prompt_blocks_json'),
    promptPath: getColumnName(this.tableName, 'prompt_path'),
    rawOutput: getColumnName(this.tableName, 'raw_output'),
    sandboxMode: getColumnName(this.tableName, 'sandbox_mode'),
    userInput: getColumnName(this.tableName, 'user_input'),
    validationError: getColumnName(this.tableName, 'validation_error'),
    workingDirectory: getColumnName(this.tableName, 'working_directory'),
  };

  private readonly selectClause = `
    SELECT execution.*,
           agent.agn_name AS agent_name,
           LEFT(execution.${this.columns.composedPrompt}, 140) AS prompt_preview,
           LEFT(execution.${this.columns.rawOutput}, 140) AS response_preview
    FROM ${this.tableName} execution
    JOIN agent ON execution.agn_id = agent.agn_id
  `;

  async create(input: PersistExecutionInput): Promise<ExecutionDetails> {
    const result = await query<ExecutionRecord>(
      `
        INSERT INTO ${this.tableName} (
          ${this.columns.agentId},
          ${this.columns.operationKey},
          ${this.columns.cliId},
          ${this.columns.model},
          ${this.columns.promptPath},
          ${this.columns.composedPrompt},
          ${this.columns.promptBlocksJson},
          ${this.columns.rawOutput},
          ${this.columns.parsedOutputJson},
          ${this.columns.validationError},
          ${this.columns.durationMs},
          ${this.columns.workingDirectory},
          ${this.columns.sandboxMode},
          ${this.columns.contextJson},
          ${this.columns.userInput},
          ${this.columns.executedAt}
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7::jsonb, $8, $9::jsonb, $10, $11, $12, $13, $14::jsonb, $15, $16
        )
        RETURNING ${this.columns.id}
      `,
      [
        input.agentId,
        input.operationKey,
        input.cliId,
        input.model,
        input.promptPath,
        input.composedPrompt,
        JSON.stringify(input.promptBlocks),
        input.rawOutput,
        JSON.stringify(input.parsedOutput),
        input.validationError,
        input.durationMs,
        input.workingDirectory,
        input.sandboxMode,
        JSON.stringify(input.context),
        input.userInput,
        input.executedAt,
      ],
    );

    return this.findById(result.rows[0]!.exe_id) as Promise<ExecutionDetails>;
  }

  async findById(id: number): Promise<ExecutionDetails | null> {
    const result = await query<ExecutionRecord>(
      `${this.selectClause} WHERE execution.${this.columns.id} = $1`,
      [id],
    );

    return result.rows[0] ? toExecutionDetails(result.rows[0]) : null;
  }

  async list(
    queryInput: ListExecutionsQuery,
  ): Promise<{ executions: ReturnType<typeof toExecutionSummary>[]; total: number }> {
    const clauses: string[] = [];
    const params: Array<number | string> = [];
    let index = 1;

    if (queryInput.agentId) {
      clauses.push(`execution.${this.columns.agentId} = $${index++}`);
      params.push(queryInput.agentId);
    }

    if (queryInput.operationKey) {
      clauses.push(`execution.${this.columns.operationKey} = $${index++}`);
      params.push(queryInput.operationKey);
    }

    if (queryInput.cliId) {
      clauses.push(`execution.${this.columns.cliId} = $${index++}`);
      params.push(queryInput.cliId);
    }

    if (queryInput.model) {
      clauses.push(`execution.${this.columns.model} = $${index++}`);
      params.push(queryInput.model);
    }

    if (queryInput.search) {
      clauses.push(
        `(
          execution.${this.columns.composedPrompt} ILIKE $${index++}
          OR execution.${this.columns.rawOutput} ILIKE $${index++}
        )`,
      );
      params.push(`%${queryInput.search}%`, `%${queryInput.search}%`);
    }

    const whereClause = clauses.length > 0 ? `WHERE ${clauses.join(' AND ')}` : '';
    const countResult = await query<{ total: string }>(
      `SELECT COUNT(*)::text AS total FROM ${this.tableName} execution ${whereClause}`,
      params,
    );
    const dataResult = await query<ExecutionRecord>(
      `
        ${this.selectClause}
        ${whereClause}
        ORDER BY execution.${this.columns.executedAt} DESC, execution.${this.columns.id} DESC
        LIMIT $${index++}
        OFFSET $${index++}
      `,
      [...params, queryInput.limit, queryInput.offset],
    );

    return {
      executions: dataResult.rows.map(toExecutionSummary),
      total: Number(countResult.rows[0]?.total ?? 0),
    };
  }
}
