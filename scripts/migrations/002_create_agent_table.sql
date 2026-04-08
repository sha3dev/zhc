-- Migration: Create agent table
--
-- Creates the agent table following database naming conventions:
-- - Table name: singular (agent)
-- - All columns have 3-letter prefix (agn_)
-- - Foreign keys maintain original table's prefix
--
-- See docs/DATABASE_CONVENTIONS.md for complete rules

BEGIN;

-- Agent table: stores AI agent configurations
CREATE TABLE agent (
    -- Primary key
    agn_id SERIAL PRIMARY KEY,

    -- Core attributes
    agn_name VARCHAR(255) NOT NULL,
    agn_soul TEXT NOT NULL,
    agn_model VARCHAR(50) NOT NULL,

    -- Status
    agn_status VARCHAR(20) NOT NULL DEFAULT 'active',

    -- Timestamps
    agn_created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    agn_updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    -- Constraints
    CONSTRAINT check_agn_status CHECK (agn_status IN ('active', 'inactive', 'archived')),
    CONSTRAINT check_agn_model CHECK (agn_model IN (
        'claude-opus-4-6',
        'claude-sonnet-4-6',
        'claude-haiku-4-5',
        'gpt-4',
        'gpt-4-turbo',
        'gpt-4o',
        'o1-preview',
        'o1-mini',
        'deepseek-chat',
        'deepseek-coder'
    ))
);

-- Comments
COMMENT ON TABLE agent IS 'AI agents with distinct personalities and capabilities';
COMMENT ON COLUMN agent.agn_id IS 'Primary key';
COMMENT ON COLUMN agent.agn_name IS 'Human-readable name for the agent';
COMMENT ON COLUMN agent.agn_soul IS 'Personality definition in markdown format (traits, role, behavior)';
COMMENT ON COLUMN agent.agn_model IS 'AI model used by this agent (e.g., claude-opus-4-6, gpt-4)';
COMMENT ON COLUMN agent.agn_status IS 'Current status: active, inactive, or archived';
COMMENT ON COLUMN agent.agn_created_at IS 'Timestamp when agent was created';
COMMENT ON COLUMN agent.agn_updated_at IS 'Timestamp when agent was last updated';

-- Indexes
CREATE INDEX idx_agent_agn_name ON agent(agn_name);
CREATE INDEX idx_agent_agn_model ON agent(agn_model);
CREATE INDEX idx_agent_agn_status ON agent(agn_status);
-- Trigger to update agn_updated_at on row modification
CREATE OR REPLACE FUNCTION update_agent_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.agn_updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_agent_updated_at
    BEFORE UPDATE ON agent
    FOR EACH ROW
    EXECUTE FUNCTION update_agent_updated_at();

COMMIT;
