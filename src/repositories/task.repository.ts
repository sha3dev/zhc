/**
 * Task Repository
 *
 * Handles all database operations for the Task entity.
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
  CreateTaskDTO,
  Task,
  TaskEntity,
  TaskQueryParams,
  TaskStatus,
} from '../types/project.js';

/**
 * Convert database entity to domain model
 */
function entityToTask(entity: TaskEntity): Task {
  return {
    id: entity.TSK_id,
    projectId: entity.PRJ_id,
    assignedTo: undefined, // Will be populated if needed
    title: entity.TSK_title,
    description: entity.TSK_description,
    status: entity.TSK_status,
    sort: entity.TSK_sort,
    dependsOn: [], // Will be populated if needed
    dependents: [], // Will be populated if needed
    createdAt: entity.TSK_created_at,
    updatedAt: entity.TSK_updated_at,
  };
}

/**
 * Task Repository
 */
export class TaskRepository {
  private readonly tableName = 'task';
  private readonly dependencyTableName = 'task_dependency';
  private readonly columns = {
    id: getPrimaryKeyColumn(this.tableName), // TSK_id
    projectId: getForeignKeyColumn('project', 'id'), // PRJ_id
    assignedToAgentId: getForeignKeyColumn('agent', 'id'), // AGN_id
    title: getColumnName(this.tableName, 'title'), // TSK_title
    description: getColumnName(this.tableName, 'description'), // TSK_description
    status: getColumnName(this.tableName, 'status'), // TSK_status
    sort: getColumnName(this.tableName, 'sort'), // TSK_sort
    createdAt: getTimestampColumn(this.tableName, 'created_at'), // TSK_created_at
    updatedAt: getTimestampColumn(this.tableName, 'updated_at'), // TSK_updated_at
  };

  private readonly dependencyColumns = {
    id: getPrimaryKeyColumn(this.dependencyTableName), // TDP_id
    taskId: getForeignKeyColumn('task', 'id'), // TSK_id
    dependsOnTaskId: 'depends_on_TSK_id', // depends_on_TSK_id
    createdAt: getTimestampColumn(this.dependencyTableName, 'created_at'), // TDP_created_at
  };

  /**
   * Create a new task
   */
  async create(dto: CreateTaskDTO): Promise<Task> {
    const sql = `
      INSERT INTO ${this.tableName} (
        ${this.columns.projectId},
        ${this.columns.assignedToAgentId},
        ${this.columns.title},
        ${this.columns.description},
        ${this.columns.sort},
        ${this.columns.status}
      ) VALUES ($1, $2, $3, $4, $5, 'pending')
      RETURNING *
    `;

    const params = [dto.projectId, dto.assignedToAgentId, dto.title, dto.description, dto.sort];

    const result = await query<TaskEntity>(sql, params);
    if (result.rows.length === 0) {
      throw new Error('Failed to create task');
    }

    const task = entityToTask(result.rows[0]!);

    // Create dependencies
    if (dto.dependsOnTaskIds.length > 0) {
      await this.setDependencies(task.id, dto.dependsOnTaskIds);
    }

    return task;
  }

  /**
   * Find task by ID
   */
  async findById(id: number): Promise<Task | null> {
    const sql = `
      SELECT * FROM ${this.tableName}
      WHERE ${this.columns.id} = $1
    `;

    const result = await query<TaskEntity>(sql, [id]);

    if (result.rows.length === 0) {
      return null;
    }

    return entityToTask(result.rows[0]!);
  }

  /**
   * Find task by ID with full relations
   */
  async findByIdWithRelations(id: number): Promise<Task | null> {
    const sql = `
      SELECT * FROM ${this.tableName}
      WHERE ${this.columns.id} = $1
    `;

    const result = await query<TaskEntity>(sql, [id]);

    if (result.rows.length === 0) {
      return null;
    }

    const entity = result.rows[0]!;
    const task = entityToTask(entity);

    // Load assigned agent if exists
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
        task.assignedTo = {
          id: agentResult.rows[0]!.AGN_id,
          name: agentResult.rows[0]!.AGN_name,
          role: '', // Would need to load from soul
        };
      }
    }

    // Load dependencies
    const depSql = `
      SELECT depends_on_TSK_id
      FROM ${this.dependencyTableName}
      WHERE ${this.dependencyColumns.taskId} = $1
    `;
    const depResult = await query<{ depends_on_TSK_id: number }>(depSql, [id]);
    task.dependsOn = [];
    for (const depRow of depResult.rows) {
      const depTask = await this.findById(depRow.depends_on_TSK_id);
      if (depTask) {
        task.dependsOn.push(depTask);
      }
    }

    return task;
  }

  /**
   * Find all tasks with optional filtering
   */
  async findAll(params: TaskQueryParams = {}): Promise<{ tasks: Task[]; total: number }> {
    const { projectId, status, assignedToAgentId, offset = 0, limit = 20 } = params;

    const conditions: string[] = [];
    const queryParams: (string | number | null)[] = [];
    let paramIndex = 1;

    if (projectId) {
      conditions.push(`${this.columns.projectId} = $${paramIndex++}`);
      queryParams.push(projectId);
    }

    if (status) {
      conditions.push(`${this.columns.status} = $${paramIndex++}`);
      queryParams.push(status);
    }

    if (assignedToAgentId) {
      conditions.push(`${this.columns.assignedToAgentId} = $${paramIndex++}`);
      queryParams.push(assignedToAgentId);
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
      ORDER BY ${this.columns.sort}, ${this.columns.createdAt}
      LIMIT $${paramIndex++} OFFSET $${paramIndex++}
    `;

    queryParams.push(limit, offset);

    const dataResult = await query<TaskEntity>(dataSql, queryParams);
    const tasks = dataResult.rows.map(entityToTask);

    return { tasks, total };
  }

  /**
   * Find all tasks for a project with dependencies
   */
  async findByProjectId(projectId: number): Promise<Task[]> {
    const sql = `
      SELECT * FROM ${this.tableName}
      WHERE ${this.columns.projectId} = $1
      ORDER BY ${this.columns.sort}, ${this.columns.createdAt}
    `;

    const result = await query<TaskEntity>(sql, [projectId]);
    const tasks = result.rows.map(entityToTask);

    // Load dependencies for all tasks
    for (const task of tasks) {
      const depSql = `
        SELECT depends_on_TSK_id
        FROM ${this.dependencyTableName}
        WHERE ${this.dependencyColumns.taskId} = $1
      `;
      const depResult = await query<{ depends_on_TSK_id: number }>(depSql, [task.id]);
      task.dependsOn = [];
      for (const depRow of depResult.rows) {
        const depTask = tasks.find((t) => t.id === depRow.depends_on_TSK_id);
        if (depTask) {
          task.dependsOn.push(depTask);
        }
      }
    }

    return tasks;
  }

  /**
   * Find tasks by status
   */
  async findByStatus(status: TaskStatus): Promise<Task[]> {
    const sql = `
      SELECT * FROM ${this.tableName}
      WHERE ${this.columns.status} = $1
      ORDER BY ${this.columns.sort}, ${this.columns.createdAt}
    `;

    const result = await query<TaskEntity>(sql, [status]);
    return result.rows.map(entityToTask);
  }

  /**
   * Update task status
   */
  async updateStatus(id: number, status: TaskStatus): Promise<Task | null> {
    const sql = `
      UPDATE ${this.tableName}
      SET ${this.columns.status} = $1,
          ${this.columns.updatedAt} = CURRENT_TIMESTAMP
      WHERE ${this.columns.id} = $2
      RETURNING *
    `;

    const result = await query<TaskEntity>(sql, [status, id]);

    if (result.rows.length === 0) {
      return null;
    }

    return entityToTask(result.rows[0]!);
  }

  /**
   * Assign agent to task
   */
  async assignAgent(taskId: number, agentId: number): Promise<Task | null> {
    const sql = `
      UPDATE ${this.tableName}
      SET ${this.columns.assignedToAgentId} = $1,
          ${this.columns.status} = 'assigned',
          ${this.columns.updatedAt} = CURRENT_TIMESTAMP
      WHERE ${this.columns.id} = $2
      RETURNING *
    `;

    const result = await query<TaskEntity>(sql, [agentId, taskId]);

    if (result.rows.length === 0) {
      return null;
    }

    return entityToTask(result.rows[0]!);
  }

  /**
   * Set task dependencies
   */
  async setDependencies(taskId: number, dependsOnTaskIds: number[]): Promise<void> {
    // Delete existing dependencies
    await query(
      `DELETE FROM ${this.dependencyTableName} WHERE ${this.dependencyColumns.taskId} = $1`,
      [taskId],
    );

    // Add new dependencies
    for (const depId of dependsOnTaskIds) {
      await query(
        `
        INSERT INTO ${this.dependencyTableName} (
          ${this.dependencyColumns.taskId},
          ${this.dependencyColumns.dependsOnTaskId}
        ) VALUES ($1, $2)
      `,
        [taskId, depId],
      );
    }
  }

  /**
   * Get task dependencies (task IDs that this task depends on)
   */
  async getDependencies(taskId: number): Promise<number[]> {
    const sql = `
      SELECT ${this.dependencyColumns.dependsOnTaskId}
      FROM ${this.dependencyTableName}
      WHERE ${this.dependencyColumns.taskId} = $1
    `;

    const result = await query<{ depends_on_TSK_id: number }>(sql, [taskId]);
    return result.rows.map((row) => row.depends_on_TSK_id);
  }

  /**
   * Get task dependents (task IDs that depend on this task)
   */
  async getDependents(taskId: number): Promise<number[]> {
    const sql = `
      SELECT ${this.dependencyColumns.taskId}
      FROM ${this.dependencyTableName}
      WHERE ${this.dependencyColumns.dependsOnTaskId} = $1
    `;

    const result = await query<{ TSK_id: number }>(sql, [taskId]);
    return result.rows.map((row) => row.TSK_id);
  }

  /**
   * Check if task can be started (all dependencies completed)
   */
  async canStart(taskId: number): Promise<boolean> {
    const depIds = await this.getDependencies(taskId);

    if (depIds.length === 0) {
      return true;
    }

    const sql = `
      SELECT COUNT(*) as count
      FROM ${this.tableName}
      WHERE ${this.columns.id} = ANY($1)
      AND ${this.columns.status} != 'completed'
    `;

    const result = await query<{ count: bigint }>(sql, [depIds]);
    const incompleteCount = Number(result.rows[0]?.count ?? 0);

    return incompleteCount === 0;
  }

  /**
   * Delete a task
   */
  async delete(id: number): Promise<boolean> {
    const sql = `DELETE FROM ${this.tableName} WHERE ${this.columns.id} = $1`;

    const result = await query(sql, [id]);
    return (result.rowCount ?? 0) > 0;
  }

  /**
   * Get next pending tasks for a project (tasks that can start)
   */
  async getNextPendingTasks(projectId: number): Promise<Task[]> {
    const sql = `
      SELECT t.*
      FROM ${this.tableName} t
      WHERE t.${this.columns.projectId} = $1
      AND t.${this.columns.status} = 'pending'
      AND NOT EXISTS (
        SELECT 1
        FROM ${this.dependencyTableName} td
        JOIN ${this.tableName} t2 ON td.${this.dependencyColumns.dependsOnTaskId} = t2.${this.columns.id}
        WHERE td.${this.dependencyColumns.taskId} = t.${this.columns.id}
        AND t2.${this.columns.status} != 'completed'
      )
      ORDER BY t.${this.columns.sort}, t.${this.columns.createdAt}
    `;

    const result = await query<TaskEntity>(sql, [projectId]);
    return result.rows.map(entityToTask);
  }
}

// Export singleton instance
export const taskRepository = new TaskRepository();
