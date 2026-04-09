import { query } from '../../../shared/db/client.js';
import {
  getColumnName,
  getPrimaryKeyColumn,
  getTimestampColumn,
} from '../../../shared/db/naming.js';
import type { ListEmailsQuery } from '../application/contracts.js';
import type {
  EmailDetails,
  EmailRecord,
  EmailSummary,
  PersistEmailInput,
} from '../domain/email.js';
import { toEmailDetails, toEmailSummary } from '../domain/email.js';

export class SqlEmailsRepository {
  private readonly tableName = 'email';

  private readonly columns = {
    agentId: 'agn_id',
    bccAddresses: getColumnName(this.tableName, 'bcc_addresses'),
    ccAddresses: getColumnName(this.tableName, 'cc_addresses'),
    createdAt: getTimestampColumn(this.tableName, 'created_at'),
    direction: getColumnName(this.tableName, 'direction'),
    errorMessage: getColumnName(this.tableName, 'error_message'),
    fromAddress: getColumnName(this.tableName, 'from_address'),
    fromName: getColumnName(this.tableName, 'from_name'),
    htmlBody: getColumnName(this.tableName, 'html_body'),
    id: getPrimaryKeyColumn(this.tableName),
    inReplyToHeader: getColumnName(this.tableName, 'in_reply_to_header'),
    messageIdHeader: getColumnName(this.tableName, 'message_id_header'),
    provider: getColumnName(this.tableName, 'provider'),
    providerCreatedAt: getColumnName(this.tableName, 'provider_created_at'),
    providerMessageId: getColumnName(this.tableName, 'provider_message_id'),
    rawPayload: getColumnName(this.tableName, 'raw_payload'),
    references: getColumnName(this.tableName, 'references'),
    status: getColumnName(this.tableName, 'status'),
    subject: getColumnName(this.tableName, 'subject'),
    textBody: getColumnName(this.tableName, 'text_body'),
    toAddresses: getColumnName(this.tableName, 'to_addresses'),
    updatedAt: getTimestampColumn(this.tableName, 'updated_at'),
  };

  private readonly selectClause = `
    SELECT email.*,
           agent.agn_name AS agent_name
    FROM ${this.tableName} email
    LEFT JOIN agent ON email.agn_id = agent.agn_id
  `;

  async create(input: PersistEmailInput): Promise<EmailDetails> {
    const result = await query<EmailRecord>(
      `
        INSERT INTO ${this.tableName} (
          ${this.columns.provider},
          ${this.columns.providerMessageId},
          ${this.columns.direction},
          ${this.columns.agentId},
          ${this.columns.subject},
          ${this.columns.messageIdHeader},
          ${this.columns.inReplyToHeader},
          ${this.columns.references},
          ${this.columns.fromAddress},
          ${this.columns.fromName},
          ${this.columns.toAddresses},
          ${this.columns.ccAddresses},
          ${this.columns.bccAddresses},
          ${this.columns.textBody},
          ${this.columns.htmlBody},
          ${this.columns.rawPayload},
          ${this.columns.status},
          ${this.columns.errorMessage},
          ${this.columns.providerCreatedAt}
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8::jsonb, $9, $10, $11::jsonb, $12::jsonb,
          $13::jsonb, $14, $15, $16::jsonb, $17, $18, $19
        )
        RETURNING *
      `,
      [
        input.provider,
        input.providerMessageId,
        input.direction,
        input.agentId,
        input.subject,
        input.messageIdHeader,
        input.inReplyToHeader,
        JSON.stringify(input.references),
        input.fromAddress,
        input.fromName,
        JSON.stringify(input.toAddresses),
        JSON.stringify(input.ccAddresses),
        JSON.stringify(input.bccAddresses),
        input.textBody,
        input.htmlBody,
        JSON.stringify(input.rawPayload),
        input.status,
        input.errorMessage ?? null,
        input.providerCreatedAt,
      ],
    );

    return this.findById(result.rows[0]!.eml_id) as Promise<EmailDetails>;
  }

  async findById(id: number): Promise<EmailDetails | null> {
    const result = await query<EmailRecord>(
      `${this.selectClause} WHERE email.${this.columns.id} = $1`,
      [id],
    );

    return result.rows[0] ? toEmailDetails(result.rows[0]) : null;
  }

  async findByProviderMessageId(providerMessageId: string): Promise<EmailDetails | null> {
    const result = await query<EmailRecord>(
      `${this.selectClause} WHERE email.${this.columns.providerMessageId} = $1`,
      [providerMessageId],
    );

    return result.rows[0] ? toEmailDetails(result.rows[0]) : null;
  }

  async list(queryInput: ListEmailsQuery): Promise<{ emails: EmailSummary[]; total: number }> {
    const clauses: string[] = [];
    const params: Array<number | string> = [];
    let index = 1;

    if (queryInput.direction) {
      clauses.push(`email.${this.columns.direction} = $${index++}`);
      params.push(queryInput.direction);
    }

    if (queryInput.status) {
      clauses.push(`email.${this.columns.status} = $${index++}`);
      params.push(queryInput.status);
    }

    if (queryInput.agentId) {
      clauses.push(`email.${this.columns.agentId} = $${index++}`);
      params.push(queryInput.agentId);
    }

    if (queryInput.search) {
      clauses.push(
        `(
          email.${this.columns.subject} ILIKE $${index++}
          OR email.${this.columns.fromAddress} ILIKE $${index++}
          OR email.${this.columns.fromName} ILIKE $${index++}
          OR email.${this.columns.textBody} ILIKE $${index++}
        )`,
      );
      params.push(
        `%${queryInput.search}%`,
        `%${queryInput.search}%`,
        `%${queryInput.search}%`,
        `%${queryInput.search}%`,
      );
    }

    const whereClause = clauses.length > 0 ? `WHERE ${clauses.join(' AND ')}` : '';
    const countResult = await query<{ total: string }>(
      `SELECT COUNT(*)::text AS total FROM ${this.tableName} email ${whereClause}`,
      params,
    );

    const dataResult = await query<EmailRecord>(
      `
        ${this.selectClause}
        ${whereClause}
        ORDER BY COALESCE(email.${this.columns.providerCreatedAt}, email.${this.columns.createdAt}) DESC,
                 email.${this.columns.id} DESC
        LIMIT $${index++}
        OFFSET $${index++}
      `,
      [...params, queryInput.limit, queryInput.offset],
    );

    return {
      emails: dataResult.rows.map(toEmailSummary),
      total: Number(countResult.rows[0]?.total ?? 0),
    };
  }
}
