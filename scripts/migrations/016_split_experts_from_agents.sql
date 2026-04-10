-- Migration: split experts into their own table while preserving global actor ids

CREATE TABLE IF NOT EXISTS expert (
    exp_id INTEGER PRIMARY KEY DEFAULT nextval(pg_get_serial_sequence('agent', 'agn_id')),
    exp_name VARCHAR(255) NOT NULL,
    exp_key VARCHAR(100) NOT NULL UNIQUE,
    exp_subagent_md TEXT NOT NULL,
    exp_created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    exp_updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_expert_exp_name ON expert(exp_name);

INSERT INTO expert (
    exp_id,
    exp_name,
    exp_key,
    exp_subagent_md,
    exp_created_at,
    exp_updated_at
)
SELECT
    agn_id,
    agn_name,
    agn_key,
    agn_subagent_md,
    agn_created_at,
    agn_updated_at
FROM agent
WHERE agn_kind = 'expert'
ON CONFLICT (exp_id) DO NOTHING;

ALTER TABLE execution ADD COLUMN IF NOT EXISTS exp_id INTEGER REFERENCES expert(exp_id);
ALTER TABLE task ADD COLUMN IF NOT EXISTS exp_id INTEGER REFERENCES expert(exp_id);
ALTER TABLE task_event ADD COLUMN IF NOT EXISTS exp_id INTEGER REFERENCES expert(exp_id);

ALTER TABLE execution ALTER COLUMN agn_id DROP NOT NULL;
ALTER TABLE task_event ALTER COLUMN agn_id DROP NOT NULL;

UPDATE execution
SET exp_id = agn_id,
    agn_id = NULL
WHERE agn_id IN (SELECT exp_id FROM expert);

UPDATE task
SET exp_id = agn_id,
    agn_id = NULL
WHERE agn_id IN (SELECT exp_id FROM expert);

UPDATE task_event
SET exp_id = agn_id,
    agn_id = NULL
WHERE agn_id IN (SELECT exp_id FROM expert);

ALTER TABLE execution DROP CONSTRAINT IF EXISTS check_execution_actor_ref;
ALTER TABLE execution
    ADD CONSTRAINT check_execution_actor_ref
        CHECK (num_nonnulls(agn_id, exp_id) = 1);

ALTER TABLE task DROP CONSTRAINT IF EXISTS check_task_actor_ref;
ALTER TABLE task
    ADD CONSTRAINT check_task_actor_ref
        CHECK (num_nonnulls(agn_id, exp_id) <= 1);

ALTER TABLE task_event DROP CONSTRAINT IF EXISTS check_task_event_actor_ref;
ALTER TABLE task_event
    ADD CONSTRAINT check_task_event_actor_ref
        CHECK (num_nonnulls(agn_id, exp_id) = 1);

CREATE INDEX IF NOT EXISTS idx_execution_exp_id ON execution(exp_id);
CREATE INDEX IF NOT EXISTS idx_task_exp_id ON task(exp_id);
CREATE INDEX IF NOT EXISTS idx_task_event_exp_id ON task_event(exp_id);

DELETE FROM agent
WHERE agn_kind = 'expert';

ALTER TABLE agent DROP CONSTRAINT IF EXISTS agent_agn_kind_check;
ALTER TABLE agent DROP CONSTRAINT IF EXISTS check_agn_kind;
ALTER TABLE agent
    ADD CONSTRAINT check_agn_kind
        CHECK (agn_kind IN ('ceo', 'specialist'));

COMMENT ON TABLE expert IS 'External expert advisors, stored independently from operational agents';
COMMENT ON COLUMN expert.exp_id IS 'Primary key shared with the global actor id sequence';
COMMENT ON COLUMN expert.exp_key IS 'Stable machine-readable identifier for the expert';
COMMENT ON COLUMN expert.exp_subagent_md IS 'Expert definition markdown editable in the UI';
