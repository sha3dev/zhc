-- Migration: rename AGN_soul to AGN_subagent_md
--
-- Changes:
--   1. Rename the persisted markdown definition column to match harness terminology
--   2. Preserve existing data
--   3. Refresh the column comment

BEGIN;

ALTER TABLE agent
    RENAME COLUMN agn_soul TO agn_subagent_md;

COMMENT ON COLUMN agent.agn_subagent_md IS 'Agent definition markdown sourced from subagent files and editable in the UI';

COMMIT;
