-- Migration: restore agn_kind for the current agents module
--
-- The live agents backend still uses agn_kind to distinguish ceo/specialist/expert.
-- Add the column back and derive existing values from agn_is_ceo.

BEGIN;

ALTER TABLE agent
    ADD COLUMN IF NOT EXISTS agn_kind VARCHAR(20);

UPDATE agent
SET agn_kind = CASE
    WHEN agn_is_ceo THEN 'ceo'
    ELSE 'specialist'
END
WHERE agn_kind IS NULL;

ALTER TABLE agent
    ALTER COLUMN agn_kind SET NOT NULL;

ALTER TABLE agent
    DROP CONSTRAINT IF EXISTS check_agn_kind;

ALTER TABLE agent
    ADD CONSTRAINT check_agn_kind
        CHECK (agn_kind IN ('ceo', 'specialist', 'expert'));

CREATE INDEX IF NOT EXISTS idx_agent_agn_kind ON agent(agn_kind);

COMMENT ON COLUMN agent.agn_kind IS 'Agent category used by the orchestrator: ceo, specialist, or expert';

COMMIT;
