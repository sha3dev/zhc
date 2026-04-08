-- Migration: add stable agent key and CEO invariant
--
-- Changes:
--   1. Add AGN_key as stable machine identifier aligned with harness/subagents/*.md
--   2. Add AGN_is_ceo boolean flag
--   3. Enforce unique AGN_key
--   4. Enforce at most one CEO with a partial unique index
--   5. Prevent deleting or demoting the last CEO once one exists

BEGIN;

ALTER TABLE agent
    ADD COLUMN IF NOT EXISTS AGN_key VARCHAR(100),
    ADD COLUMN IF NOT EXISTS AGN_is_ceo BOOLEAN NOT NULL DEFAULT false;

UPDATE agent
SET AGN_key = CASE
    WHEN LOWER(TRIM(agn_name)) = 'ceo' THEN 'ceo'
    ELSE LOWER(REGEXP_REPLACE(TRIM(agn_name), '[^a-zA-Z0-9]+', '-', 'g'))
END
WHERE AGN_key IS NULL OR TRIM(AGN_key) = '';

UPDATE agent
SET AGN_is_ceo = (AGN_key = 'ceo');

ALTER TABLE agent
    ALTER COLUMN AGN_key SET NOT NULL;

ALTER TABLE agent
    ADD CONSTRAINT uq_agent_agn_key UNIQUE (AGN_key);

CREATE UNIQUE INDEX IF NOT EXISTS uq_agent_single_ceo
    ON agent (AGN_is_ceo)
    WHERE AGN_is_ceo = true;

COMMENT ON COLUMN agent.AGN_key IS 'Stable machine-readable identifier for the agent';
COMMENT ON COLUMN agent.AGN_is_ceo IS 'True only for the single CEO agent';

CREATE OR REPLACE FUNCTION guard_last_ceo()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'DELETE' THEN
        IF OLD.agn_is_ceo AND NOT EXISTS (
            SELECT 1
            FROM agent
            WHERE agn_is_ceo = true
              AND agn_id <> OLD.agn_id
        ) THEN
            RAISE EXCEPTION 'Cannot delete the last CEO agent';
        END IF;
        RETURN OLD;
    END IF;

    IF TG_OP = 'UPDATE' THEN
        IF OLD.agn_is_ceo = true
           AND NEW.agn_is_ceo = false
           AND NOT EXISTS (
               SELECT 1
               FROM agent
               WHERE agn_is_ceo = true
                 AND agn_id <> OLD.agn_id
           ) THEN
            RAISE EXCEPTION 'Cannot demote the last CEO agent';
        END IF;
        RETURN NEW;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS guard_last_ceo_on_delete ON agent;
CREATE TRIGGER guard_last_ceo_on_delete
    BEFORE DELETE ON agent
    FOR EACH ROW
    EXECUTE FUNCTION guard_last_ceo();

DROP TRIGGER IF EXISTS guard_last_ceo_on_update ON agent;
CREATE TRIGGER guard_last_ceo_on_update
    BEFORE UPDATE OF agn_is_ceo ON agent
    FOR EACH ROW
    EXECUTE FUNCTION guard_last_ceo();

COMMIT;
