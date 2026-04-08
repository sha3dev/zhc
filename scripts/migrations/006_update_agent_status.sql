-- Migration: Harness refactoring — update agent status values and make model nullable
--
-- Changes:
--   1. Truncate agent table (will be re-seeded from harness/subagents/)
--   2. Replace status constraint: active/inactive/archived → ready/not_ready/suspended
--      - ready:     model is assigned and available
--      - not_ready: no model assigned, or assigned model is no longer available
--      - suspended: user has temporarily paused the agent
--   3. Update default status column to 'not_ready'
--   4. Make agn_model nullable — bootstrap creates agents without a model;
--      the user must assign a model from the available models list
--
-- After running this migration, run: npm run seed:agents

BEGIN;

-- 1. Clear agents — will be re-seeded from harness/subagents/
TRUNCATE TABLE agent CASCADE;

-- 2. Drop old status constraint and add new one
ALTER TABLE agent DROP CONSTRAINT IF EXISTS check_agn_status;
ALTER TABLE agent ADD CONSTRAINT check_agn_status
    CHECK (agn_status IN ('ready', 'not_ready', 'suspended'));

-- 3. Update default status
ALTER TABLE agent ALTER COLUMN agn_status SET DEFAULT 'not_ready';

-- 4. Make model nullable
ALTER TABLE agent ALTER COLUMN agn_model DROP NOT NULL;

-- 5. Update comments
COMMENT ON COLUMN agent.agn_status IS 'Agent readiness: ready (model valid and assigned), not_ready (no model or model unavailable), suspended (user-paused)';
COMMENT ON COLUMN agent.agn_model IS 'AI model assigned by the user (NULL until set). Must match a name from the available models list.';

COMMIT;
