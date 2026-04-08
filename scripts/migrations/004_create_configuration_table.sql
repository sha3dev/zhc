-- Migration: Create configuration table
--
-- This migration creates the configuration table to store:
-- - Dokku server settings
-- - LLM provider API keys and defaults
--
-- There is only ONE configuration record in the system.
--
-- See docs/DATABASE_CONVENTIONS.md for naming rules

BEGIN;

-- Create configuration table
CREATE TABLE configuration (
    CFG_id SERIAL PRIMARY KEY,

    -- Dokku server settings
    CFG_dokku_host VARCHAR(255),
    CFG_dokku_port INTEGER,
    CFG_dokku_ssh_user VARCHAR(50),

    -- LLM provider API keys
    CFG_openai_api_key TEXT,
    CFG_anthropic_api_key TEXT,
    CFG_zai_api_key TEXT,
    CFG_google_api_key TEXT,
    CFG_cohere_api_key TEXT,

    -- Default LLM settings
    CFG_default_provider VARCHAR(20),
    CFG_default_model VARCHAR(100),
    CFG_max_tokens INTEGER,

    -- Timestamps
    CFG_created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CFG_updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    -- Validate provider enum
    CONSTRAINT check_configuration_provider
        CHECK (CFG_default_provider IN (
            'openai',
            'anthropic',
            'zai',
            'google',
            'cohere'
        ))
);

-- Add table and column comments
COMMENT ON TABLE configuration IS 'System-wide configuration: Dokku server and LLM providers';
COMMENT ON COLUMN configuration.CFG_id IS 'Primary key';
COMMENT ON COLUMN configuration.CFG_dokku_host IS 'Dokku server host (e.g., "dokku.example.com")';
COMMENT ON COLUMN configuration.CFG_dokku_port IS 'Dokku SSH port (default: 22)';
COMMENT ON COLUMN configuration.CFG_dokku_ssh_user IS 'Dokku SSH username (default: "dokku")';
COMMENT ON COLUMN configuration.CFG_openai_api_key IS 'OpenAI API key for LLM calls';
COMMENT ON COLUMN configuration.CFG_anthropic_api_key IS 'Anthropic API key for Claude models';
COMMENT ON COLUMN configuration.CFG_zai_api_key IS 'z.ai API key';
COMMENT ON COLUMN configuration.CFG_google_api_key IS 'Google AI API key';
COMMENT ON COLUMN configuration.CFG_cohere_api_key IS 'Cohere API key';
COMMENT ON COLUMN configuration.CFG_default_provider IS 'Default LLM provider to use';
COMMENT ON COLUMN configuration.CFG_default_model IS 'Default model identifier (e.g., "gpt-4", "claude-opus-4-6")';
COMMENT ON COLUMN configuration.CFG_max_tokens IS 'Maximum tokens for LLM responses';
COMMENT ON COLUMN configuration.CFG_created_at IS 'Configuration creation timestamp';
COMMENT ON COLUMN configuration.CFG_updated_at IS 'Last update timestamp';

COMMIT;

-- Notes:
-- 1. There is only ONE configuration record in the system
-- 2. Projects link to Dokku using their slug as the app name
-- 3. API keys are stored as TEXT to accommodate various key lengths
-- 4. Sensitive API keys should never be exposed in API responses
-- 5. Use InternalConfiguration type internally (unmasked keys)
-- 6. Use ConfigurationResponseDTO for API responses (masked keys)
