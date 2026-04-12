BEGIN;

ALTER TABLE configuration
    ADD COLUMN IF NOT EXISTS cfg_human_email VARCHAR(255);

ALTER TABLE task
    DROP CONSTRAINT IF EXISTS check_task_status;

UPDATE task
SET tsk_status = 'pending'
WHERE tsk_status = 'assigned';

UPDATE task
SET tsk_status = 'waiting'
WHERE tsk_status IN ('awaiting_review', 'changes_requested');

UPDATE task
SET tsk_status = 'failed'
WHERE tsk_status = 'blocked';

DELETE FROM task_event
WHERE tev_kind IN ('assignment', 'submission', 'dependency_risk_flagged');

UPDATE task_event
SET tev_kind = 'run_request'
WHERE tev_kind = 'ceo_instruction';

UPDATE task_event
SET tev_kind = 'agent_response',
    tev_metadata_json = COALESCE(tev_metadata_json, '{}'::jsonb) || jsonb_build_object(
        'responseType',
        COALESCE(tev_metadata_json ->> 'responseType', 'ready_for_approval')
    )
WHERE tev_kind = 'agent_reply';

UPDATE task_event
SET tev_kind = 'ceo_response',
    tev_metadata_json = COALESCE(tev_metadata_json, '{}'::jsonb) || jsonb_build_object(
        'responseType',
        COALESCE(tev_metadata_json ->> 'responseType', 'approved')
    )
WHERE tev_kind = 'approval';

UPDATE task_event
SET tev_kind = 'ceo_response',
    tev_metadata_json = COALESCE(tev_metadata_json, '{}'::jsonb) || jsonb_build_object(
        'responseType',
        COALESCE(tev_metadata_json ->> 'responseType', 'denied')
    )
WHERE tev_kind = 'changes_requested';

UPDATE task_event
SET tev_kind = 'status_changed',
    tev_metadata_json = COALESCE(tev_metadata_json, '{}'::jsonb) || jsonb_build_object(
        'previousKind',
        'blocked'
    )
WHERE tev_kind = 'blocked';

ALTER TABLE task
    ADD CONSTRAINT check_task_status
    CHECK (tsk_status IN (
        'pending',
        'in_progress',
        'waiting',
        'completed',
        'failed',
        'cancelled'
    ));

ALTER TABLE task_event
    DROP CONSTRAINT IF EXISTS check_task_event_kind;

ALTER TABLE task_event
    ADD CONSTRAINT check_task_event_kind
    CHECK (tev_kind IN (
        'run_request',
        'agent_response',
        'ceo_response',
        'human_feedback_request',
        'human_feedback',
        'status_changed'
    ));

DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM task
        WHERE num_nonnulls(agn_id, exp_id) != 1
    ) THEN
        RAISE EXCEPTION 'All tasks must have exactly one assigned agent or expert before applying migration 017';
    END IF;
END $$;

ALTER TABLE task
    DROP CONSTRAINT IF EXISTS check_task_actor_ref;

ALTER TABLE task
    ADD CONSTRAINT check_task_actor_ref
        CHECK (num_nonnulls(agn_id, exp_id) = 1);

COMMENT ON COLUMN task.tsk_status IS 'Task status: pending, in_progress, waiting, completed, failed, cancelled';
COMMENT ON COLUMN task.tsk_has_dependency_risk IS 'True when an upstream task changed after this task was completed';
COMMENT ON COLUMN task_event.tev_kind IS 'Event kind: run_request, agent_response, ceo_response, human_feedback_request, human_feedback, status_changed';
COMMENT ON COLUMN configuration.cfg_human_email IS 'Fallback human recipient address for CEO escalation requests';

COMMIT;
