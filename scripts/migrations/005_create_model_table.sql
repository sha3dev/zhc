-- Migration: Create model table
--
-- Creates the model table to track available LLM models per provider.
-- Models are discovered dynamically by calling each provider's API.
-- Agents reference models by name (text); no FK constraint is used so that
-- agents continue to work even when a model is retired / becomes unavailable.
--
-- Also removes the hardcoded CHECK constraint on agent.agn_model so the column
-- accepts any model name from this table.
--
-- See docs/DATABASE_CONVENTIONS.md for naming rules

BEGIN;

-- ── 1. Remove the hardcoded model enum constraint from agent ─────────────────

ALTER TABLE agent DROP CONSTRAINT IF EXISTS check_agn_model;

-- ── 2. Create model table (prefix: mdl) ──────────────────────────────────────

CREATE TABLE model (
    mdl_id           SERIAL PRIMARY KEY,

    -- Identity
    mdl_name         VARCHAR(100) NOT NULL,
    mdl_display_name VARCHAR(255),
    mdl_provider     VARCHAR(50)  NOT NULL,

    -- Availability tracking
    mdl_is_available BOOLEAN      NOT NULL DEFAULT true,
    mdl_last_seen_at TIMESTAMP,

    -- Timestamps
    mdl_created_at   TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    mdl_updated_at   TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT uq_model_provider_name UNIQUE (mdl_provider, mdl_name),
    CONSTRAINT check_mdl_provider CHECK (mdl_provider IN ('anthropic', 'openai', 'deepseek', 'zai'))
);

COMMENT ON TABLE  model                  IS 'LLM models discovered from configured provider API keys';
COMMENT ON COLUMN model.mdl_id           IS 'Primary key';
COMMENT ON COLUMN model.mdl_name         IS 'Model identifier as returned by the provider API (e.g. claude-opus-4-6)';
COMMENT ON COLUMN model.mdl_display_name IS 'Human-readable name returned by the provider API';
COMMENT ON COLUMN model.mdl_provider     IS 'LLM provider: anthropic, openai, deepseek, or zai';
COMMENT ON COLUMN model.mdl_is_available IS 'false when the model was present before but not returned in the last refresh';
COMMENT ON COLUMN model.mdl_last_seen_at IS 'Timestamp of the last successful refresh that included this model';
COMMENT ON COLUMN model.mdl_created_at   IS 'Row creation timestamp';
COMMENT ON COLUMN model.mdl_updated_at   IS 'Row last-updated timestamp';

CREATE INDEX idx_model_provider    ON model (mdl_provider);
CREATE INDEX idx_model_available   ON model (mdl_is_available);
CREATE INDEX idx_model_last_seen   ON model (mdl_last_seen_at);

-- Trigger: keep mdl_updated_at current
CREATE OR REPLACE FUNCTION update_model_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.mdl_updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_model_updated_at
    BEFORE UPDATE ON model
    FOR EACH ROW
    EXECUTE FUNCTION update_model_updated_at();

-- ── 3. Add cfg_zai_base_url to configuration if not already present ──────────

ALTER TABLE configuration
    ADD COLUMN IF NOT EXISTS cfg_zai_base_url TEXT;

COMMENT ON COLUMN configuration.cfg_zai_base_url IS 'Z.ai / opencode API base URL (e.g. https://api.z.ai/v1)';

-- ── 4. Seed known models (will be refreshed from provider APIs later) ─────────

INSERT INTO model (mdl_name, mdl_display_name, mdl_provider, mdl_last_seen_at) VALUES
    -- Anthropic
    ('claude-opus-4-6',    'Claude Opus 4.6',    'anthropic', CURRENT_TIMESTAMP),
    ('claude-sonnet-4-6',  'Claude Sonnet 4.6',  'anthropic', CURRENT_TIMESTAMP),
    ('claude-haiku-4-5',   'Claude Haiku 4.5',   'anthropic', CURRENT_TIMESTAMP),
    -- OpenAI
    ('gpt-4',              'GPT-4',              'openai',    CURRENT_TIMESTAMP),
    ('gpt-4-turbo',        'GPT-4 Turbo',        'openai',    CURRENT_TIMESTAMP),
    ('gpt-4o',             'GPT-4o',             'openai',    CURRENT_TIMESTAMP),
    ('o1-preview',         'o1 Preview',         'openai',    CURRENT_TIMESTAMP),
    ('o1-mini',            'o1 Mini',            'openai',    CURRENT_TIMESTAMP),
    -- DeepSeek
    ('deepseek-chat',      'DeepSeek Chat',      'deepseek',  CURRENT_TIMESTAMP),
    ('deepseek-coder',     'DeepSeek Coder',     'deepseek',  CURRENT_TIMESTAMP)
ON CONFLICT (mdl_provider, mdl_name) DO NOTHING;

COMMIT;
