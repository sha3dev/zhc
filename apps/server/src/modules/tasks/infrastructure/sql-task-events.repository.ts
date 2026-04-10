import { query } from '../../../shared/db/client.js';
import type { CreateTaskEventInput, TaskEventsRepository } from '../application/contracts.js';
import type { TaskEvent, TaskEventRecord } from '../domain/task-event.js';
import { toTaskEvent } from './mappers.js';

export class SqlTaskEventsRepository implements TaskEventsRepository {
  private readonly tableName = 'task_event';

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

  async create(input: CreateTaskEventInput): Promise<TaskEvent> {
    const actor = await this.resolveActorColumns(input.authorAgentId);
    const result = await query<{ tev_id: number }>(
      `
        INSERT INTO ${this.tableName} (
          tsk_id,
          agn_id,
          exp_id,
          exe_id,
          tev_kind,
          tev_body,
          tev_metadata_json
        ) VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb)
        RETURNING tev_id
      `,
      [
        input.taskId,
        actor.agentId,
        actor.expertId,
        input.executionId ?? null,
        input.kind,
        input.body,
        JSON.stringify(input.metadata ?? null),
      ],
    );

    const created = await query<TaskEventRecord>(
      `
        SELECT task_event.*,
               COALESCE(agent.agn_id, expert.exp_id) AS actor_id,
               COALESCE(agent.agn_name, expert.exp_name) AS agent_name
        FROM ${this.tableName} task_event
        LEFT JOIN agent ON task_event.agn_id = agent.agn_id
        LEFT JOIN expert ON task_event.exp_id = expert.exp_id
        WHERE task_event.tev_id = $1
      `,
      [result.rows[0]!.tev_id],
    );

    return toTaskEvent(created.rows[0]!);
  }

  async findByTaskId(taskId: number): Promise<TaskEvent[]> {
    const result = await query<TaskEventRecord>(
      `
        SELECT task_event.*,
               COALESCE(agent.agn_id, expert.exp_id) AS actor_id,
               COALESCE(agent.agn_name, expert.exp_name) AS agent_name
        FROM ${this.tableName} task_event
        LEFT JOIN agent ON task_event.agn_id = agent.agn_id
        LEFT JOIN expert ON task_event.exp_id = expert.exp_id
        WHERE task_event.tsk_id = $1
        ORDER BY task_event.tev_created_at ASC, task_event.tev_id ASC
      `,
      [taskId],
    );

    return result.rows.map(toTaskEvent);
  }
}
