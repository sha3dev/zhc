/**
 * Configuration types following database naming conventions
 *
 * This file defines all types related to the Configuration entity, including:
 * - Database entity types (stored in PostgreSQL)
 * - Domain types (used in application logic)
 * - DTO types (for API requests/responses)
 *
 * Configuration stores system-wide settings:
 * - Dokku server configuration
 * - LLM provider API keys and defaults
 *
 * There is only ONE configuration record in the system.
 */

/**
 * LLM Provider types supported by OpenCode
 */
export type LLMProvider = 'openai' | 'anthropic' | 'zai' | 'google' | 'cohere';

/**
 * Database entity: configuration
 *
 * This represents configuration as stored in PostgreSQL.
 * Column names follow the database naming conventions (CFG_ prefix).
 *
 * There is only ONE configuration record in the system.
 */
export interface ConfigurationEntity {
  /** Primary key: CFG_id */
  CFG_id: number;
  /** Dokku host (e.g., "dokku.example.com"): CFG_dokku_host */
  CFG_dokku_host: string | null;
  /** Dokku SSH port (default 22): CFG_dokku_port */
  CFG_dokku_port: number | null;
  /** Dokku SSH username (default "dokku"): CFG_dokku_ssh_user */
  CFG_dokku_ssh_user: string | null;
  /** OpenAI API key: CFG_openai_api_key */
  CFG_openai_api_key: string | null;
  /** Anthropic API key: CFG_anthropic_api_key */
  CFG_anthropic_api_key: string | null;
  /** z.ai API key: CFG_zai_api_key */
  CFG_zai_api_key: string | null;
  /** Google AI API key: CFG_google_api_key */
  CFG_google_api_key: string | null;
  /** Cohere API key: CFG_cohere_api_key */
  CFG_cohere_api_key: string | null;
  /** Default LLM provider: CFG_default_provider */
  CFG_default_provider: LLMProvider | null;
  /** Default model to use (e.g., "gpt-4", "claude-opus-4-6"): CFG_default_model */
  CFG_default_model: string | null;
  /** Maximum tokens for LLM responses: CFG_max_tokens */
  CFG_max_tokens: number | null;
  /** Creation timestamp: CFG_created_at */
  CFG_created_at: Date;
  /** Last update timestamp: CFG_updated_at */
  CFG_updated_at: Date;
}

/**
 * Domain model: Configuration
 *
 * This is the configuration type used throughout the application.
 */
export interface Configuration {
  /** Unique identifier */
  id: number;
  /** Dokku server settings */
  dokku?: {
    /** Dokku host */
    host: string;
    /** SSH port (default: 22) */
    port: number;
    /** SSH username (default: "dokku") */
    sshUser: string;
  };
  /** LLM provider API keys */
  llmProviders?: {
    /** OpenAI configuration */
    openai?: {
      apiKey: string;
    };
    /** Anthropic configuration */
    anthropic?: {
      apiKey: string;
    };
    /** z.ai configuration */
    zai?: {
      apiKey: string;
    };
    /** Google AI configuration */
    google?: {
      apiKey: string;
    };
    /** Cohere configuration */
    cohere?: {
      apiKey: string;
    };
  };
  /** Default LLM settings */
  defaultLLM?: {
    /** Provider to use by default */
    provider: LLMProvider;
    /** Model identifier */
    model: string;
    /** Maximum tokens for responses */
    maxTokens: number;
  };
  /** When this configuration was created */
  createdAt: Date;
  /** Last update timestamp */
  updatedAt: Date;
}

/**
 * DTO: Create Configuration Request
 *
 * Data transfer object for creating the system configuration.
 * There should only be one configuration record.
 */
export interface CreateConfigurationDTO {
  /** Dokku settings */
  dokku?: {
    /** Dokku host */
    host: string;
    /** SSH port (default: 22) */
    port?: number;
    /** SSH username (default: "dokku") */
    sshUser?: string;
  };
  /** LLM provider API keys */
  llmProviders?: {
    openai?: string;
    anthropic?: string;
    zai?: string;
    google?: string;
    cohere?: string;
  };
  /** Default LLM settings */
  defaultLLM?: {
    /** Provider */
    provider: LLMProvider;
    /** Model identifier */
    model: string;
    /** Maximum tokens (default: 4096) */
    maxTokens?: number;
  };
}

/**
 * DTO: Update Configuration Request
 *
 * Data transfer object for updating the system configuration.
 */
export interface UpdateConfigurationDTO {
  /** Dokku settings */
  dokku?: {
    /** Dokku host */
    host?: string;
    /** SSH port */
    port?: number;
    /** SSH username */
    sshUser?: string;
  };
  /** LLM provider API keys (set to null to remove) */
  llmProviders?: {
    openai?: string | null;
    anthropic?: string | null;
    zai?: string | null;
    google?: string | null;
    cohere?: string | null;
  };
  /** Default LLM settings */
  defaultLLM?: {
    /** Provider */
    provider: LLMProvider;
    /** Model identifier */
    model: string;
    /** Maximum tokens */
    maxTokens?: number;
  };
}

/**
 * DTO: Configuration Response
 *
 * Data transfer object for configuration API responses.
 * API keys are partially masked for security.
 */
export interface ConfigurationResponseDTO {
  /** Configuration ID */
  id: number;
  /** Dokku settings */
  dokku?: {
    host: string;
    port: number;
    sshUser: string;
  };
  /** LLM providers (API keys masked) */
  llmProviders?: {
    openai?: { hasKey: boolean };
    anthropic?: { hasKey: boolean };
    zai?: { hasKey: boolean };
    google?: { hasKey: boolean };
    cohere?: { hasKey: boolean };
  };
  /** Default LLM settings */
  defaultLLM?: {
    provider: LLMProvider;
    model: string;
    maxTokens: number;
  };
  /** Creation timestamp */
  createdAt: Date;
  /** Last update timestamp */
  updatedAt: Date;
}

/**
 * Internal configuration (includes actual API keys)
 *
 * This is used internally by agents to call LLM providers.
 * Never expose this in API responses.
 */
export interface InternalConfiguration extends Omit<ConfigurationResponseDTO, 'llmProviders'> {
  /** Unmasked API keys for internal use */
  llmProviders?: {
    openai?: string;
    anthropic?: string;
    zai?: string;
    google?: string;
    cohere?: string;
  };
}

/**
 * Configuration query parameters
 */
export interface ConfigurationQueryParams {
  /** Pagination offset */
  offset?: number;
  /** Pagination limit */
  limit?: number;
}
