BEGIN;

CREATE TABLE IF NOT EXISTS task_event_attachment (
    tea_id SERIAL PRIMARY KEY,
    tev_id INTEGER NOT NULL REFERENCES task_event(tev_id) ON DELETE CASCADE,
    tea_kind VARCHAR(32) NOT NULL,
    tea_title VARCHAR(255) NOT NULL,
    tea_path TEXT,
    tea_url TEXT,
    tea_media_type VARCHAR(255),
    tea_size_bytes BIGINT,
    tea_created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE task_event_attachment
    DROP CONSTRAINT IF EXISTS check_task_event_attachment_kind;

ALTER TABLE task_event_attachment
    ADD CONSTRAINT check_task_event_attachment_kind
    CHECK (tea_kind IN ('project_file', 'external_url'));

ALTER TABLE task_event_attachment
    DROP CONSTRAINT IF EXISTS check_task_event_attachment_payload;

ALTER TABLE task_event_attachment
    ADD CONSTRAINT check_task_event_attachment_payload
    CHECK (
        (tea_kind = 'project_file' AND tea_path IS NOT NULL AND tea_url IS NULL)
        OR
        (tea_kind = 'external_url' AND tea_url IS NOT NULL AND tea_path IS NULL)
    );

CREATE INDEX IF NOT EXISTS idx_task_event_attachment_tev_id ON task_event_attachment(tev_id);
CREATE INDEX IF NOT EXISTS idx_task_event_attachment_kind ON task_event_attachment(tea_kind);

COMMENT ON TABLE task_event_attachment IS 'Attachments associated with task thread events';
COMMENT ON COLUMN task_event_attachment.tea_kind IS 'Attachment kind: project_file or external_url';
COMMENT ON COLUMN task_event_attachment.tea_path IS 'Project-relative path for project_file attachments';
COMMENT ON COLUMN task_event_attachment.tea_url IS 'External URL for external_url attachments';

COMMIT;
