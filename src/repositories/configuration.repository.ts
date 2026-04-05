/**
 * Configuration Repository
 *
 * Handles all database operations for the Configuration entity.
 * Uses database naming utilities for consistent column naming.
 *
 * There is only ONE configuration record in the system.
 */

import { getColumnName, getPrimaryKeyColumn, getTimestampColumn, query } from '../db/index.js';
import type {
  Configuration,
  ConfigurationEntity,
  ConfigurationQueryParams,
  CreateConfigurationDTO,
  InternalConfiguration,
  UpdateConfigurationDTO,
} from '../types/configuration.js';

/**
 * Convert database entity to domain model
 */
function entityToConfiguration(entity: ConfigurationEntity): Configuration {
  const config: Configuration = {
    id: entity.CFG_id,
    createdAt: entity.CFG_created_at,
    updatedAt: entity.CFG_updated_at,
  };

  // Add Dokku configuration if present
  if (entity.CFG_dokku_host) {
    config.dokku = {
      host: entity.CFG_dokku_host,
      port: entity.CFG_dokku_port ?? 22,
      sshUser: entity.CFG_dokku_ssh_user ?? 'dokku',
    };
  }

  // Add LLM provider configuration if any API key is present
  const hasAnyKey =
    entity.CFG_openai_api_key ||
    entity.CFG_anthropic_api_key ||
    entity.CFG_zai_api_key ||
    entity.CFG_google_api_key ||
    entity.CFG_cohere_api_key;

  if (hasAnyKey) {
    config.llmProviders = {};
    if (entity.CFG_openai_api_key) {
      config.llmProviders.openai = { apiKey: entity.CFG_openai_api_key };
    }
    if (entity.CFG_anthropic_api_key) {
      config.llmProviders.anthropic = { apiKey: entity.CFG_anthropic_api_key };
    }
    if (entity.CFG_zai_api_key) {
      config.llmProviders.zai = { apiKey: entity.CFG_zai_api_key };
    }
    if (entity.CFG_google_api_key) {
      config.llmProviders.google = { apiKey: entity.CFG_google_api_key };
    }
    if (entity.CFG_cohere_api_key) {
      config.llmProviders.cohere = { apiKey: entity.CFG_cohere_api_key };
    }
  }

  // Add default LLM settings if present
  if (entity.CFG_default_provider && entity.CFG_default_model) {
    config.defaultLLM = {
      provider: entity.CFG_default_provider,
      model: entity.CFG_default_model,
      maxTokens: entity.CFG_max_tokens ?? 4096,
    };
  }

  return config;
}

/**
 * Convert database entity to internal configuration (with unmasked API keys)
 */
function entityToInternalConfiguration(entity: ConfigurationEntity): InternalConfiguration {
  const config: InternalConfiguration = {
    id: entity.CFG_id,
    createdAt: entity.CFG_created_at,
    updatedAt: entity.CFG_updated_at,
  };

  // Add Dokku configuration if present
  if (entity.CFG_dokku_host) {
    config.dokku = {
      host: entity.CFG_dokku_host,
      port: entity.CFG_dokku_port ?? 22,
      sshUser: entity.CFG_dokku_ssh_user ?? 'dokku',
    };
  }

  // Add LLM provider API keys (unmasked)
  const hasAnyKey =
    entity.CFG_openai_api_key ||
    entity.CFG_anthropic_api_key ||
    entity.CFG_zai_api_key ||
    entity.CFG_google_api_key ||
    entity.CFG_cohere_api_key;

  if (hasAnyKey) {
    config.llmProviders = {};
    if (entity.CFG_openai_api_key) {
      config.llmProviders.openai = entity.CFG_openai_api_key;
    }
    if (entity.CFG_anthropic_api_key) {
      config.llmProviders.anthropic = entity.CFG_anthropic_api_key;
    }
    if (entity.CFG_zai_api_key) {
      config.llmProviders.zai = entity.CFG_zai_api_key;
    }
    if (entity.CFG_google_api_key) {
      config.llmProviders.google = entity.CFG_google_api_key;
    }
    if (entity.CFG_cohere_api_key) {
      config.llmProviders.cohere = entity.CFG_cohere_api_key;
    }
  }

  // Add default LLM settings if present
  if (entity.CFG_default_provider && entity.CFG_default_model) {
    config.defaultLLM = {
      provider: entity.CFG_default_provider,
      model: entity.CFG_default_model,
      maxTokens: entity.CFG_max_tokens ?? 4096,
    };
  }

  return config;
}

/**
 * Configuration Repository
 */
export class ConfigurationRepository {
  private readonly tableName = 'configuration';
  private readonly columns = {
    id: getPrimaryKeyColumn(this.tableName), // CFG_id
    dokkuHost: getColumnName(this.tableName, 'dokku_host'), // CFG_dokku_host
    dokkuPort: getColumnName(this.tableName, 'dokku_port'), // CFG_dokku_port
    dokkuSshUser: getColumnName(this.tableName, 'dokku_ssh_user'), // CFG_dokku_ssh_user
    openaiApiKey: getColumnName(this.tableName, 'openai_api_key'), // CFG_openai_api_key
    anthropicApiKey: getColumnName(this.tableName, 'anthropic_api_key'), // CFG_anthropic_api_key
    zaiApiKey: getColumnName(this.tableName, 'zai_api_key'), // CFG_zai_api_key
    googleApiKey: getColumnName(this.tableName, 'google_api_key'), // CFG_google_api_key
    cohereApiKey: getColumnName(this.tableName, 'cohere_api_key'), // CFG_cohere_api_key
    defaultProvider: getColumnName(this.tableName, 'default_provider'), // CFG_default_provider
    defaultModel: getColumnName(this.tableName, 'default_model'), // CFG_default_model
    maxTokens: getColumnName(this.tableName, 'max_tokens'), // CFG_max_tokens
    createdAt: getTimestampColumn(this.tableName, 'created_at'), // CFG_created_at
    updatedAt: getTimestampColumn(this.tableName, 'updated_at'), // CFG_updated_at
  };

  /**
   * Get the system configuration (there's only one)
   */
  async get(): Promise<Configuration | null> {
    const sql = `
      SELECT * FROM ${this.tableName}
      LIMIT 1
    `;

    const result = await query<ConfigurationEntity>(sql, []);

    if (result.rows.length === 0) {
      return null;
    }

    return entityToConfiguration(result.rows[0]!);
  }

  /**
   * Get the system configuration (internal, with unmasked API keys)
   */
  async getInternal(): Promise<InternalConfiguration | null> {
    const sql = `
      SELECT * FROM ${this.tableName}
      LIMIT 1
    `;

    const result = await query<ConfigurationEntity>(sql, []);

    if (result.rows.length === 0) {
      return null;
    }

    return entityToInternalConfiguration(result.rows[0]!);
  }

  /**
   * Find configuration by ID
   */
  async findById(id: number): Promise<Configuration | null> {
    const sql = `
      SELECT * FROM ${this.tableName}
      WHERE ${this.columns.id} = $1
    `;

    const result = await query<ConfigurationEntity>(sql, [id]);

    if (result.rows.length === 0) {
      return null;
    }

    return entityToConfiguration(result.rows[0]!);
  }

  /**
   * Create the system configuration
   */
  async create(dto: CreateConfigurationDTO): Promise<Configuration> {
    const sql = `
      INSERT INTO ${this.tableName} (
        ${this.columns.dokkuHost},
        ${this.columns.dokkuPort},
        ${this.columns.dokkuSshUser},
        ${this.columns.openaiApiKey},
        ${this.columns.anthropicApiKey},
        ${this.columns.zaiApiKey},
        ${this.columns.googleApiKey},
        ${this.columns.cohereApiKey},
        ${this.columns.defaultProvider},
        ${this.columns.defaultModel},
        ${this.columns.maxTokens}
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11
      )
      RETURNING *
    `;

    const params = [
      dto.dokku?.host ?? null,
      dto.dokku?.port ?? null,
      dto.dokku?.sshUser ?? null,
      dto.llmProviders?.openai ?? null,
      dto.llmProviders?.anthropic ?? null,
      dto.llmProviders?.zai ?? null,
      dto.llmProviders?.google ?? null,
      dto.llmProviders?.cohere ?? null,
      dto.defaultLLM?.provider ?? null,
      dto.defaultLLM?.model ?? null,
      dto.defaultLLM?.maxTokens ?? null,
    ];

    const result = await query<ConfigurationEntity>(sql, params);
    if (result.rows.length === 0) {
      throw new Error('Failed to create configuration');
    }
    return entityToConfiguration(result.rows[0]!);
  }

  /**
   * Update the system configuration
   */
  async update(dto: UpdateConfigurationDTO): Promise<Configuration | null> {
    const updates: string[] = [];
    const params: (string | number | null)[] = [];
    let paramIndex = 1;

    if (dto.dokku !== undefined) {
      if (dto.dokku.host !== undefined) {
        updates.push(`${this.columns.dokkuHost} = $${paramIndex++}`);
        params.push(dto.dokku.host);
      }
      if (dto.dokku.port !== undefined) {
        updates.push(`${this.columns.dokkuPort} = $${paramIndex++}`);
        params.push(dto.dokku.port);
      }
      if (dto.dokku.sshUser !== undefined) {
        updates.push(`${this.columns.dokkuSshUser} = $${paramIndex++}`);
        params.push(dto.dokku.sshUser);
      }
    }

    if (dto.llmProviders !== undefined) {
      if (dto.llmProviders.openai !== undefined) {
        updates.push(`${this.columns.openaiApiKey} = $${paramIndex++}`);
        params.push(dto.llmProviders.openai);
      }
      if (dto.llmProviders.anthropic !== undefined) {
        updates.push(`${this.columns.anthropicApiKey} = $${paramIndex++}`);
        params.push(dto.llmProviders.anthropic);
      }
      if (dto.llmProviders.zai !== undefined) {
        updates.push(`${this.columns.zaiApiKey} = $${paramIndex++}`);
        params.push(dto.llmProviders.zai);
      }
      if (dto.llmProviders.google !== undefined) {
        updates.push(`${this.columns.googleApiKey} = $${paramIndex++}`);
        params.push(dto.llmProviders.google);
      }
      if (dto.llmProviders.cohere !== undefined) {
        updates.push(`${this.columns.cohereApiKey} = $${paramIndex++}`);
        params.push(dto.llmProviders.cohere);
      }
    }

    if (dto.defaultLLM !== undefined) {
      updates.push(`${this.columns.defaultProvider} = $${paramIndex++}`);
      params.push(dto.defaultLLM.provider);

      updates.push(`${this.columns.defaultModel} = $${paramIndex++}`);
      params.push(dto.defaultLLM.model);

      if (dto.defaultLLM.maxTokens !== undefined) {
        updates.push(`${this.columns.maxTokens} = $${paramIndex++}`);
        params.push(dto.defaultLLM.maxTokens);
      }
    }

    if (updates.length === 0) {
      return this.get();
    }

    // Always update updated_at
    updates.push(`${this.columns.updatedAt} = CURRENT_TIMESTAMP`);

    const sql = `
      UPDATE ${this.tableName}
      SET ${updates.join(', ')}
      WHERE ${this.columns.id} = (SELECT ${this.columns.id} FROM ${this.tableName} LIMIT 1)
      RETURNING *
    `;

    const result = await query<ConfigurationEntity>(sql, params);

    if (result.rows.length === 0) {
      return null;
    }

    return entityToConfiguration(result.rows[0]!);
  }

  /**
   * Delete the configuration
   */
  async delete(): Promise<boolean> {
    const sql = `DELETE FROM ${this.tableName}`;

    const result = await query(sql, []);
    return (result.rowCount ?? 0) > 0;
  }

  /**
   * Check if configuration exists
   */
  async exists(): Promise<boolean> {
    const sql = `
      SELECT 1 FROM ${this.tableName}
      LIMIT 1
    `;

    const result = await query(sql, []);
    return (result.rows.length ?? 0) > 0;
  }
}

// Export singleton instance
export const configurationRepository = new ConfigurationRepository();
