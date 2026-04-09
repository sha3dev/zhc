import { query } from '../../../shared/db/client.js';
import {
  getColumnName,
  getPrimaryKeyColumn,
  getTimestampColumn,
} from '../../../shared/db/naming.js';
import type { UpdateConfigurationInput } from '../application/contracts.js';
import type { ConfigurationRecord, InternalConfiguration } from '../domain/configuration.js';
import { toInternalConfiguration } from '../domain/configuration.js';

function normalizeOptionalString(value: string | null | undefined): string | null | undefined {
  if (value === undefined) {
    return undefined;
  }

  if (value === null) {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export class SqlConfigurationRepository {
  private readonly tableName = 'configuration';

  private readonly columns = {
    dokkuHost: getColumnName(this.tableName, 'dokku_host'),
    dokkuPort: getColumnName(this.tableName, 'dokku_port'),
    dokkuSshUser: getColumnName(this.tableName, 'dokku_ssh_user'),
    emailFromAddress: getColumnName(this.tableName, 'email_from_address'),
    emailFromName: getColumnName(this.tableName, 'email_from_name'),
    emailInboundAddress: getColumnName(this.tableName, 'email_inbound_address'),
    emailPollEnabled: getColumnName(this.tableName, 'email_poll_enabled'),
    emailPollIntervalSeconds: getColumnName(this.tableName, 'email_poll_interval_seconds'),
    emailProvider: getColumnName(this.tableName, 'email_provider'),
    githubAppId: getColumnName(this.tableName, 'github_app_id'),
    githubClientId: getColumnName(this.tableName, 'github_client_id'),
    githubClientSecret: getColumnName(this.tableName, 'github_client_secret'),
    githubInstallationId: getColumnName(this.tableName, 'github_installation_id'),
    githubPrivateKey: getColumnName(this.tableName, 'github_private_key'),
    id: getPrimaryKeyColumn(this.tableName),
    resendApiKey: getColumnName(this.tableName, 'resend_api_key'),
    updatedAt: getTimestampColumn(this.tableName, 'updated_at'),
  };

  async get(): Promise<InternalConfiguration> {
    return toInternalConfiguration(await this.ensureRecord());
  }

  async update(input: UpdateConfigurationInput): Promise<InternalConfiguration> {
    const existing = await this.ensureRecord();
    const updates: string[] = [];
    const params: Array<boolean | number | string | null> = [];
    let index = 1;

    const pushUpdate = (column: string, value: boolean | number | string | null | undefined) => {
      if (value === undefined) {
        return;
      }

      updates.push(`${column} = $${index++}`);
      params.push(value);
    };

    pushUpdate(this.columns.dokkuHost, normalizeOptionalString(input.dokku?.host));
    pushUpdate(this.columns.dokkuPort, input.dokku?.port);
    pushUpdate(this.columns.dokkuSshUser, normalizeOptionalString(input.dokku?.sshUser));

    pushUpdate(this.columns.githubAppId, normalizeOptionalString(input.github?.appId));
    pushUpdate(
      this.columns.githubInstallationId,
      normalizeOptionalString(input.github?.installationId),
    );
    pushUpdate(this.columns.githubClientId, normalizeOptionalString(input.github?.clientId));
    pushUpdate(
      this.columns.githubClientSecret,
      normalizeOptionalString(input.github?.clientSecret),
    );
    pushUpdate(this.columns.githubPrivateKey, normalizeOptionalString(input.github?.privateKey));

    pushUpdate(this.columns.emailProvider, 'resend');
    pushUpdate(this.columns.resendApiKey, normalizeOptionalString(input.email?.resendApiKey));
    pushUpdate(this.columns.emailFromName, normalizeOptionalString(input.email?.fromName));
    pushUpdate(this.columns.emailFromAddress, normalizeOptionalString(input.email?.fromAddress));
    pushUpdate(
      this.columns.emailInboundAddress,
      normalizeOptionalString(input.email?.inboundAddress),
    );
    pushUpdate(this.columns.emailPollEnabled, input.email?.pollEnabled);
    pushUpdate(this.columns.emailPollIntervalSeconds, input.email?.pollIntervalSeconds);

    if (updates.length === 0) {
      return toInternalConfiguration(existing);
    }

    const result = await query<ConfigurationRecord>(
      `
        UPDATE ${this.tableName}
        SET ${updates.join(', ')},
            ${this.columns.updatedAt} = CURRENT_TIMESTAMP
        WHERE ${this.columns.id} = $${index}
        RETURNING *
      `,
      [...params, existing.cfg_id],
    );

    return toInternalConfiguration(result.rows[0] ?? existing);
  }

  private async ensureRecord(): Promise<ConfigurationRecord> {
    const existing = await query<ConfigurationRecord>(
      `
        SELECT *
        FROM ${this.tableName}
        ORDER BY ${this.columns.id} ASC
        LIMIT 1
      `,
    );

    if (existing.rows[0]) {
      return existing.rows[0];
    }

    const created = await query<ConfigurationRecord>(
      `
        INSERT INTO ${this.tableName} (
          ${this.columns.emailProvider},
          ${this.columns.emailPollEnabled},
          ${this.columns.emailPollIntervalSeconds}
        ) VALUES ('resend', false, 60)
        RETURNING *
      `,
    );

    return created.rows[0]!;
  }
}
