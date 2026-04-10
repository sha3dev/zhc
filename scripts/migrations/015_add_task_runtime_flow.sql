BEGIN;

ALTER TABLE task
    DROP CONSTRAINT IF EXISTS check_task_status;

ALTER TABLE task
    ADD CONSTRAINT check_task_status
    CHECK (tsk_status IN (
        'pending',
        'assigned',
        'in_progress',
        'awaiting_review',
        'changes_requested',
        'reopened',
        'completed',
        'failed',
        'blocked',
        'cancelled'
    ));

ALTER TABLE task
    ADD COLUMN IF NOT EXISTS tsk_review_cycle INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS tsk_reopen_count INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS tsk_reopened_at TIMESTAMP,
    ADD COLUMN IF NOT EXISTS tsk_completed_at TIMESTAMP,
    ADD COLUMN IF NOT EXISTS tsk_reopened_from_tev_id INTEGER,
    ADD COLUMN IF NOT EXISTS tsk_has_dependency_risk BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS exe_id INTEGER REFERENCES execution(exe_id);

CREATE TABLE IF NOT EXISTS task_event (
    tev_id SERIAL PRIMARY KEY,
    tsk_id INTEGER NOT NULL REFERENCES task(tsk_id) ON DELETE CASCADE,
    agn_id INTEGER NOT NULL REFERENCES agent(agn_id),
    exe_id INTEGER REFERENCES execution(exe_id) ON DELETE SET NULL,
    tev_kind VARCHAR(64) NOT NULL,
    tev_body TEXT NOT NULL,
    tev_metadata_json JSONB,
    tev_created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE task
    ADD CONSTRAINT fk_task_tsk_reopened_from_tev_id
    FOREIGN KEY (tsk_reopened_from_tev_id)
    REFERENCES task_event(tev_id)
    ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_task_tsk_review_cycle ON task(tsk_review_cycle);
CREATE INDEX IF NOT EXISTS idx_task_tsk_has_dependency_risk ON task(tsk_has_dependency_risk);
CREATE INDEX IF NOT EXISTS idx_task_exe_id ON task(exe_id);
CREATE INDEX IF NOT EXISTS idx_task_event_tsk_id_tev_created_at ON task_event(tsk_id, tev_created_at DESC);
CREATE INDEX IF NOT EXISTS idx_task_event_agn_id ON task_event(agn_id);
CREATE INDEX IF NOT EXISTS idx_task_event_exe_id ON task_event(exe_id);
CREATE INDEX IF NOT EXISTS idx_task_event_tev_kind ON task_event(tev_kind);

COMMENT ON COLUMN task.tsk_review_cycle IS 'Current review cycle number for the task';
COMMENT ON COLUMN task.tsk_reopen_count IS 'Number of explicit reopen actions on the task';
COMMENT ON COLUMN task.tsk_reopened_at IS 'Latest reopen timestamp';
COMMENT ON COLUMN task.tsk_completed_at IS 'Latest approval timestamp';
COMMENT ON COLUMN task.tsk_reopened_from_tev_id IS 'Task event that caused the latest reopen';
COMMENT ON COLUMN task.tsk_has_dependency_risk IS 'True when an upstream reopened task may invalidate this task';
COMMENT ON COLUMN task.exe_id IS 'Most recent execution associated with this task';

COMMENT ON TABLE task_event IS 'Operational task thread events and workflow actions';
COMMENT ON COLUMN task_event.tev_kind IS 'Event kind: assignment, ceo_instruction, agent_reply, submission, approval, changes_requested, reopened, blocked, status_changed, dependency_risk_flagged';
COMMENT ON COLUMN task_event.tev_metadata_json IS 'Structured metadata for workflow actions';

COMMIT;
