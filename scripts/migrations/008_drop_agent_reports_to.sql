-- Migration: remove agent reports_to hierarchy column
--
-- All agents conceptually report to the CEO, so we no longer persist an arbitrary
-- reports_to relationship on the agent table.

BEGIN;

DROP INDEX IF EXISTS idx_agent_agn_reports_to_agn_id;

ALTER TABLE agent
    DROP COLUMN IF EXISTS agn_reports_to_agn_id;

COMMIT;
