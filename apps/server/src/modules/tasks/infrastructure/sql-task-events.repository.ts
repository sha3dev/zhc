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

    if (input.attachments && input.attachments.length > 0) {
      for (const attachment of input.attachments) {
        await query(
          `
            INSERT INTO task_event_attachment (
              tev_id,
              tea_kind,
              tea_title,
              tea_path,
              tea_url,
              tea_media_type,
              tea_size_bytes
            ) VALUES ($1, $2, $3, $4, $5, $6, $7)
          `,
          [
            result.rows[0]!.tev_id,
            attachment.kind,
            attachment.title,
            attachment.kind === 'project_file' ? attachment.path : null,
            attachment.kind === 'external_url' ? attachment.url : null,
            attachment.mediaType ?? null,
            null,
          ],
        );
      }
    }

    const created = await query<TaskEventRecord>(
      `
        SELECT task_event.*,
               COALESCE(agent.agn_id, expert.exp_id) AS actor_id,
               COALESCE(agent.agn_name, expert.exp_name) AS agent_name,
               COALESCE((
                 SELECT jsonb_agg(jsonb_build_object(
                   'tea_id', attachment.tea_id,
                   'tea_kind', attachment.tea_kind,
                   'tea_media_type', attachment.tea_media_type,
                   'tea_path', attachment.tea_path,
                   'tea_size_bytes', attachment.tea_size_bytes,
                   'tea_title', attachment.tea_title,
                   'tea_url', attachment.tea_url,
                   'tev_id', attachment.tev_id
                 ) ORDER BY attachment.tea_id ASC)
                 FROM task_event_attachment attachment
                 WHERE attachment.tev_id = task_event.tev_id
               ), '[]'::jsonb) AS task_event_attachments_json
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
               COALESCE(agent.agn_name, expert.exp_name) AS agent_name,
               COALESCE((
                 SELECT jsonb_agg(jsonb_build_object(
                   'tea_id', attachment.tea_id,
                   'tea_kind', attachment.tea_kind,
                   'tea_media_type', attachment.tea_media_type,
                   'tea_path', attachment.tea_path,
                   'tea_size_bytes', attachment.tea_size_bytes,
                   'tea_title', attachment.tea_title,
                   'tea_url', attachment.tea_url,
                   'tev_id', attachment.tev_id
                 ) ORDER BY attachment.tea_id ASC)
                 FROM task_event_attachment attachment
                 WHERE attachment.tev_id = task_event.tev_id
               ), '[]'::jsonb) AS task_event_attachments_json
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

  async findAttachment(taskId: number, attachmentId: number) {
    const result = await query<{
      event_id: number;
      tea_kind: 'project_file' | 'external_url';
      tea_media_type: string | null;
      tea_path: string | null;
      tea_title: string;
      tea_url: string | null;
    }>(
      `
        SELECT
          attachment.tev_id AS event_id,
          attachment.tea_kind,
          attachment.tea_media_type,
          attachment.tea_path,
          attachment.tea_title,
          attachment.tea_url
        FROM task_event_attachment attachment
        INNER JOIN task_event event ON event.tev_id = attachment.tev_id
        WHERE attachment.tea_id = $1
          AND event.tsk_id = $2
      `,
      [attachmentId, taskId],
    );

    const row = result.rows[0];
    if (!row) {
      return null;
    }

    return {
      eventId: row.event_id,
      kind: row.tea_kind,
      mediaType: row.tea_media_type,
      path: row.tea_path,
      title: row.tea_title,
      url: row.tea_url,
    };
  }
}
