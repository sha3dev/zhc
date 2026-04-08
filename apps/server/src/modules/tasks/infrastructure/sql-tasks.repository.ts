import { query } from '../../../shared/db/client.js';
import {
  getColumnName,
  getPrimaryKeyColumn,
  getTimestampColumn,
} from '../../../shared/db/naming.js';
import type { CreateTaskInput, ListTasksQuery, TasksRepository } from '../application/contracts.js';
import type { Task, TaskDependencyRecord, TaskRecord } from '../domain/task.js';
import { toTask } from './mappers.js';

export class SqlTasksRepository implements TasksRepository {
  private readonly tableName = 'task';
  private readonly dependencyTableName = 'task_dependency';

  private readonly columns = {
    assignedToAgentId: 'agn_id',
    createdAt: getTimestampColumn(this.tableName, 'created_at'),
    description: getColumnName(this.tableName, 'description'),
    id: getPrimaryKeyColumn(this.tableName),
    projectId: 'prj_id',
    sort: getColumnName(this.tableName, 'sort'),
    status: getColumnName(this.tableName, 'status'),
    title: getColumnName(this.tableName, 'title'),
    updatedAt: getTimestampColumn(this.tableName, 'updated_at'),
  };

  async assign(taskId: number, agentId: number): Promise<Task | null> {
    const result = await query<TaskRecord>(
      `
        UPDATE ${this.tableName}
        SET ${this.columns.assignedToAgentId} = $1,
            ${this.columns.status} = 'assigned',
            ${this.columns.updatedAt} = CURRENT_TIMESTAMP
        WHERE ${this.columns.id} = $2
        RETURNING *
      `,
      [agentId, taskId],
    );

    if (!result.rows[0]) {
      return null;
    }

    return this.hydrate(result.rows[0]);
  }

  async canStart(taskId: number): Promise<boolean> {
    const dependencies = await this.getDependencies(taskId);

    if (dependencies.length === 0) {
      return true;
    }

    const result = await query<{ count: string }>(
      `
        SELECT COUNT(*)::text AS count
        FROM ${this.tableName}
        WHERE ${this.columns.id} = ANY($1)
          AND ${this.columns.status} != 'completed'
      `,
      [dependencies],
    );

    return Number(result.rows[0]?.count ?? 0) === 0;
  }

  async create(input: CreateTaskInput): Promise<Task> {
    const result = await query<TaskRecord>(
      `
        INSERT INTO ${this.tableName} (
          ${this.columns.projectId},
          ${this.columns.assignedToAgentId},
          ${this.columns.title},
          ${this.columns.description},
          ${this.columns.sort},
          ${this.columns.status}
        ) VALUES ($1, $2, $3, $4, $5, 'pending')
        RETURNING *
      `,
      [
        input.projectId,
        input.assignedToAgentId ?? null,
        input.title,
        input.description,
        input.sort,
      ],
    );

    const task = result.rows[0]!;

    if (input.dependsOnTaskIds.length > 0) {
      await this.replaceDependencies(task.tsk_id, input.dependsOnTaskIds);
    }

    return this.hydrate(task);
  }

  async findAll(filters: ListTasksQuery): Promise<{ tasks: Task[]; total: number }> {
    const clauses: string[] = [];
    const params: Array<number | string> = [];
    let index = 1;

    if (filters.projectId) {
      clauses.push(`${this.columns.projectId} = $${index++}`);
      params.push(filters.projectId);
    }

    if (filters.status) {
      clauses.push(`${this.columns.status} = $${index++}`);
      params.push(filters.status);
    }

    if (filters.assignedToAgentId) {
      clauses.push(`${this.columns.assignedToAgentId} = $${index++}`);
      params.push(filters.assignedToAgentId);
    }

    const whereClause = clauses.length > 0 ? `WHERE ${clauses.join(' AND ')}` : '';

    const countResult = await query<{ total: string }>(
      `SELECT COUNT(*)::text AS total FROM ${this.tableName} ${whereClause}`,
      params,
    );

    const dataResult = await query<TaskRecord>(
      `
        SELECT *
        FROM ${this.tableName}
        ${whereClause}
        ORDER BY ${this.columns.sort} ASC, ${this.columns.createdAt} ASC
        LIMIT $${index++}
        OFFSET $${index++}
      `,
      [...params, filters.limit, filters.offset],
    );

    const tasks = await Promise.all(dataResult.rows.map((row) => this.hydrate(row)));

    return {
      tasks,
      total: Number(countResult.rows[0]?.total ?? 0),
    };
  }

  async findById(id: number): Promise<Task | null> {
    const result = await query<TaskRecord>(
      `SELECT * FROM ${this.tableName} WHERE ${this.columns.id} = $1`,
      [id],
    );

    if (!result.rows[0]) {
      return null;
    }

    return this.hydrate(result.rows[0]);
  }

  async findByProjectId(projectId: number): Promise<Task[]> {
    const result = await query<TaskRecord>(
      `
        SELECT *
        FROM ${this.tableName}
        WHERE ${this.columns.projectId} = $1
        ORDER BY ${this.columns.sort} ASC, ${this.columns.createdAt} ASC
      `,
      [projectId],
    );

    return Promise.all(result.rows.map((row) => this.hydrate(row)));
  }

  async getNextPendingTasks(projectId: number): Promise<Task[]> {
    const result = await query<TaskRecord>(
      `
        SELECT task.*
        FROM ${this.tableName} task
        WHERE task.${this.columns.projectId} = $1
          AND task.${this.columns.status} = 'pending'
          AND NOT EXISTS (
            SELECT 1
            FROM ${this.dependencyTableName} dependency
            JOIN ${this.tableName} prerequisite
              ON dependency.depends_on_tsk_id = prerequisite.${this.columns.id}
            WHERE dependency.tsk_id = task.${this.columns.id}
              AND prerequisite.${this.columns.status} != 'completed'
          )
        ORDER BY task.${this.columns.sort} ASC, task.${this.columns.createdAt} ASC
      `,
      [projectId],
    );

    return Promise.all(result.rows.map((row) => this.hydrate(row)));
  }

  async updateStatus(taskId: number, status: Task['status']): Promise<Task | null> {
    const result = await query<TaskRecord>(
      `
        UPDATE ${this.tableName}
        SET ${this.columns.status} = $1,
            ${this.columns.updatedAt} = CURRENT_TIMESTAMP
        WHERE ${this.columns.id} = $2
        RETURNING *
      `,
      [status, taskId],
    );

    if (!result.rows[0]) {
      return null;
    }

    return this.hydrate(result.rows[0]);
  }

  private async getDependencies(taskId: number): Promise<number[]> {
    const result = await query<TaskDependencyRecord>(
      `
        SELECT tsk_id AS tsk_id, depends_on_tsk_id AS depends_on_tsk_id
        FROM ${this.dependencyTableName}
        WHERE tsk_id = $1
      `,
      [taskId],
    );

    return result.rows.map((row) => row.depends_on_tsk_id);
  }

  private async hydrate(record: TaskRecord): Promise<Task> {
    const dependencyIds = await this.getDependencies(record.tsk_id);
    return toTask(record, dependencyIds);
  }

  private async replaceDependencies(taskId: number, dependencyIds: number[]): Promise<void> {
    await query(`DELETE FROM ${this.dependencyTableName} WHERE tsk_id = $1`, [taskId]);

    for (const dependencyId of dependencyIds) {
      await query(
        `
          INSERT INTO ${this.dependencyTableName} (tsk_id, depends_on_tsk_id)
          VALUES ($1, $2)
        `,
        [taskId, dependencyId],
      );
    }
  }
}
