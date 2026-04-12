import { query } from '../../../shared/db/client.js';
import {
  getColumnName,
  getPrimaryKeyColumn,
  getTimestampColumn,
} from '../../../shared/db/naming.js';
import { ValidationError } from '../../../shared/errors/app-error.js';
import type { CreateTaskInput, ListTasksQuery, TasksRepository } from '../application/contracts.js';
import type { Task, TaskDependencyRecord, TaskRecord } from '../domain/task.js';
import { toTask } from './mappers.js';

export class SqlTasksRepository implements TasksRepository {
  private readonly tableName = 'task';
  private readonly dependencyTableName = 'task_dependency';

  private readonly columns = {
    assignedToAgentId: 'agn_id',
    assignedToExpertId: 'exp_id',
    createdAt: getTimestampColumn(this.tableName, 'created_at'),
    description: getColumnName(this.tableName, 'description'),
    hasDependencyRisk: getColumnName(this.tableName, 'has_dependency_risk'),
    id: getPrimaryKeyColumn(this.tableName),
    lastExecutionId: 'exe_id',
    projectId: 'prj_id',
    completedAt: getColumnName(this.tableName, 'completed_at'),
    reviewCycle: getColumnName(this.tableName, 'review_cycle'),
    sort: getColumnName(this.tableName, 'sort'),
    status: getColumnName(this.tableName, 'status'),
    title: getColumnName(this.tableName, 'title'),
    updatedAt: getTimestampColumn(this.tableName, 'updated_at'),
  };

  private async resolveActorColumns(
    actorId: number,
  ): Promise<{ agentId: number | null; expertId: number | null }> {
    const result = await query<{ agn_id: number | null; exp_id: number | null }>(
      `
        SELECT
          (SELECT agn_id FROM agent WHERE agn_id = $1) AS agn_id,
          (SELECT exp_id FROM expert WHERE exp_id = $1) AS exp_id
      `,
      [actorId],
    );

    return {
      agentId: result.rows[0]?.agn_id ?? null,
      expertId: result.rows[0]?.exp_id ?? null,
    };
  }

  async assign(taskId: number, agentId: number): Promise<Task | null> {
    const actor = await this.resolveActorColumns(agentId);
    if (!actor.agentId && !actor.expertId) {
      throw new ValidationError(`Actor ${agentId} does not exist`);
    }
    const result = await query<{ tsk_id: number }>(
      `
        UPDATE ${this.tableName}
        SET ${this.columns.assignedToAgentId} = $1,
            ${this.columns.assignedToExpertId} = $2,
            ${this.columns.updatedAt} = CURRENT_TIMESTAMP
        WHERE ${this.columns.id} = $3
        RETURNING ${this.columns.id}
      `,
      [actor.agentId, actor.expertId, taskId],
    );

    if (!result.rows[0]) {
      return null;
    }

    return this.findById(result.rows[0].tsk_id);
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
    const actor = await this.resolveActorColumns(input.assignedToAgentId);
    if (!actor.agentId && !actor.expertId) {
      throw new ValidationError(`Actor ${input.assignedToAgentId} does not exist`);
    }
    const result = await query<{ tsk_id: number }>(
      `
        INSERT INTO ${this.tableName} (
          ${this.columns.projectId},
          ${this.columns.assignedToAgentId},
          ${this.columns.assignedToExpertId},
          ${this.columns.title},
          ${this.columns.description},
          ${this.columns.sort},
          ${this.columns.status}
        ) VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING ${this.columns.id}
      `,
      [
        input.projectId,
        actor.agentId,
        actor.expertId,
        input.title,
        input.description,
        input.sort,
        'pending',
      ],
    );

    const task = result.rows[0]!;

    if (input.dependsOnTaskIds.length > 0) {
      await this.replaceDependencies(task.tsk_id, input.dependsOnTaskIds);
    }

    return (await this.findById(task.tsk_id))!;
  }

  async findAll(filters: ListTasksQuery): Promise<{ tasks: Task[]; total: number }> {
    const clauses: string[] = [];
    const params: Array<number | string> = [];
    let index = 1;

    if (filters.projectId) {
      clauses.push(`task.${this.columns.projectId} = $${index++}`);
      params.push(filters.projectId);
    }

    if (filters.status) {
      clauses.push(`task.${this.columns.status} = $${index++}`);
      params.push(filters.status);
    }

    if (filters.assignedToAgentId) {
      clauses.push(
        `(task.${this.columns.assignedToAgentId} = $${index++} OR task.${this.columns.assignedToExpertId} = $${index++})`,
      );
      params.push(filters.assignedToAgentId);
      params.push(filters.assignedToAgentId);
    }

    const whereClause = clauses.length > 0 ? `WHERE ${clauses.join(' AND ')}` : '';

    const countResult = await query<{ total: string }>(
      `SELECT COUNT(*)::text AS total FROM ${this.tableName} task ${whereClause}`,
      params,
    );

    const dataResult = await query<TaskRecord>(
      `
        SELECT task.*,
               COALESCE(agent.agn_id, expert.exp_id) AS actor_id,
               COALESCE(agent.agn_name, expert.exp_name) AS agent_name
        FROM ${this.tableName} task
        LEFT JOIN agent
          ON task.${this.columns.assignedToAgentId} = agent.agn_id
        LEFT JOIN expert
          ON task.${this.columns.assignedToExpertId} = expert.exp_id
        ${whereClause}
        ORDER BY task.${this.columns.sort} ASC, task.${this.columns.createdAt} ASC
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

  async findDependents(taskId: number): Promise<Task[]> {
    const result = await query<TaskRecord>(
      `
        WITH RECURSIVE dependent_tree AS (
          SELECT dependency.tsk_id
          FROM ${this.dependencyTableName} dependency
          WHERE dependency.depends_on_tsk_id = $1
          UNION
          SELECT dependency.tsk_id
          FROM ${this.dependencyTableName} dependency
          JOIN dependent_tree tree ON tree.tsk_id = dependency.depends_on_tsk_id
        )
        SELECT DISTINCT task.*,
               COALESCE(agent.agn_id, expert.exp_id) AS actor_id,
               COALESCE(agent.agn_name, expert.exp_name) AS agent_name
        FROM dependent_tree
        JOIN ${this.tableName} task ON task.${this.columns.id} = dependent_tree.tsk_id
        LEFT JOIN agent
          ON task.${this.columns.assignedToAgentId} = agent.agn_id
        LEFT JOIN expert
          ON task.${this.columns.assignedToExpertId} = expert.exp_id
        ORDER BY task.${this.columns.sort} ASC, task.${this.columns.createdAt} ASC
      `,
      [taskId],
    );

    return Promise.all(result.rows.map((row) => this.hydrate(row)));
  }

  async findById(id: number): Promise<Task | null> {
    const result = await query<TaskRecord>(
      `
        SELECT task.*,
               COALESCE(agent.agn_id, expert.exp_id) AS actor_id,
               COALESCE(agent.agn_name, expert.exp_name) AS agent_name
        FROM ${this.tableName} task
        LEFT JOIN agent
          ON task.${this.columns.assignedToAgentId} = agent.agn_id
        LEFT JOIN expert
          ON task.${this.columns.assignedToExpertId} = expert.exp_id
        WHERE task.${this.columns.id} = $1
      `,
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
        SELECT task.*,
               COALESCE(agent.agn_id, expert.exp_id) AS actor_id,
               COALESCE(agent.agn_name, expert.exp_name) AS agent_name
        FROM ${this.tableName} task
        LEFT JOIN agent
          ON task.${this.columns.assignedToAgentId} = agent.agn_id
        LEFT JOIN expert
          ON task.${this.columns.assignedToExpertId} = expert.exp_id
        WHERE task.${this.columns.projectId} = $1
        ORDER BY task.${this.columns.sort} ASC, task.${this.columns.createdAt} ASC
      `,
      [projectId],
    );

    return Promise.all(result.rows.map((row) => this.hydrate(row)));
  }

  async getNextPendingTasks(projectId: number): Promise<Task[]> {
    const result = await query<TaskRecord>(
      `
        SELECT task.*,
               COALESCE(agent.agn_id, expert.exp_id) AS actor_id,
               COALESCE(agent.agn_name, expert.exp_name) AS agent_name
        FROM ${this.tableName} task
        LEFT JOIN agent
          ON task.${this.columns.assignedToAgentId} = agent.agn_id
        LEFT JOIN expert
          ON task.${this.columns.assignedToExpertId} = expert.exp_id
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
    return this.update(taskId, { status });
  }

  async setDependencyRisk(taskIds: number[], hasDependencyRisk: boolean): Promise<void> {
    if (taskIds.length === 0) {
      return;
    }

    await query(
      `
        UPDATE ${this.tableName}
        SET ${this.columns.hasDependencyRisk} = $1,
            ${this.columns.updatedAt} = CURRENT_TIMESTAMP
        WHERE ${this.columns.id} = ANY($2)
      `,
      [hasDependencyRisk, taskIds],
    );
  }

  async update(
    taskId: number,
    input: {
      completedAt?: Date | null;
      hasDependencyRisk?: boolean;
      lastExecutionId?: number | null;
      reviewCycle?: number;
      status?: Task['status'];
    },
  ): Promise<Task | null> {
    const updates: string[] = [];
    const params: Array<Date | boolean | number | string | null> = [];
    let index = 1;

    if (input.status !== undefined) {
      updates.push(`${this.columns.status} = $${index++}`);
      params.push(input.status);
    }

    if (input.reviewCycle !== undefined) {
      updates.push(`${this.columns.reviewCycle} = $${index++}`);
      params.push(input.reviewCycle);
    }

    if (input.completedAt !== undefined) {
      updates.push(`${this.columns.completedAt} = $${index++}`);
      params.push(input.completedAt);
    }

    if (input.hasDependencyRisk !== undefined) {
      updates.push(`${this.columns.hasDependencyRisk} = $${index++}`);
      params.push(input.hasDependencyRisk);
    }

    if (input.lastExecutionId !== undefined) {
      updates.push(`${this.columns.lastExecutionId} = $${index++}`);
      params.push(input.lastExecutionId);
    }

    if (updates.length === 0) {
      return this.findById(taskId);
    }

    const result = await query<{ tsk_id: number }>(
      `
        UPDATE ${this.tableName}
        SET ${updates.join(', ')},
            ${this.columns.updatedAt} = CURRENT_TIMESTAMP
        WHERE ${this.columns.id} = $${index}
        RETURNING ${this.columns.id}
      `,
      [...params, taskId],
    );

    if (!result.rows[0]) {
      return null;
    }

    return this.findById(result.rows[0].tsk_id);
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
