-- Migration: persist the full CLI+model relation on agents
--
-- Changes:
--   1. Add agn_model_cli nullable column
--   2. Backfill existing rows where the model is uniquely provided by one configured CLI
--   3. Enforce that agn_model and agn_model_cli are set or cleared together
--   4. Add index and updated comments

BEGIN;

ALTER TABLE agent
    ADD COLUMN IF NOT EXISTS agn_model_cli VARCHAR(100);

UPDATE agent
SET agn_model_cli = CASE
    WHEN agn_model LIKE 'claude-%' THEN 'claude_code'
    WHEN agn_model LIKE 'gemini-%' THEN 'gemini_cli'
    WHEN agn_model IN ('gpt-4o', 'gpt-4o-mini', 'o3', 'o4-mini', 'gpt-5.4') THEN 'codex'
    ELSE agn_model_cli
END
WHERE agn_model IS NOT NULL
  AND agn_model_cli IS NULL;

ALTER TABLE agent
    DROP CONSTRAINT IF EXISTS check_agent_model_selection_pair;

ALTER TABLE agent
    ADD CONSTRAINT check_agent_model_selection_pair
    CHECK (
        (agn_model IS NULL AND agn_model_cli IS NULL)
        OR
        (agn_model IS NOT NULL AND agn_model_cli IS NOT NULL)
    );

CREATE INDEX IF NOT EXISTS idx_agent_agn_model_cli ON agent(agn_model_cli);

COMMENT ON COLUMN agent.agn_model_cli IS 'CLI tool selected for the assigned model (e.g. codex, claude_code, gemini_cli, opencode)';
COMMENT ON COLUMN agent.agn_model IS 'Model assigned within the selected CLI. agn_model_cli + agn_model form the full runtime selection.';

COMMIT;
