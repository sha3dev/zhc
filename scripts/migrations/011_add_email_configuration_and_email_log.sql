-- Migration: add email configuration and email log
--
-- Extends the singleton configuration table with GitHub app fields and
-- Resend/polling settings, and creates the email table used as the
-- platform-wide inbound/outbound log.

BEGIN;

ALTER TABLE configuration
    ADD COLUMN IF NOT EXISTS CFG_github_app_id VARCHAR(50),
    ADD COLUMN IF NOT EXISTS CFG_github_installation_id VARCHAR(50),
    ADD COLUMN IF NOT EXISTS CFG_github_client_id VARCHAR(255),
    ADD COLUMN IF NOT EXISTS CFG_github_client_secret TEXT,
    ADD COLUMN IF NOT EXISTS CFG_github_private_key TEXT,
    ADD COLUMN IF NOT EXISTS CFG_email_provider VARCHAR(20),
    ADD COLUMN IF NOT EXISTS CFG_resend_api_key TEXT,
    ADD COLUMN IF NOT EXISTS CFG_email_from_name VARCHAR(255),
    ADD COLUMN IF NOT EXISTS CFG_email_from_address VARCHAR(320),
    ADD COLUMN IF NOT EXISTS CFG_email_inbound_address VARCHAR(320),
    ADD COLUMN IF NOT EXISTS CFG_email_poll_enabled BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN IF NOT EXISTS CFG_email_poll_interval_seconds INTEGER NOT NULL DEFAULT 60;

UPDATE configuration
SET CFG_email_provider = COALESCE(CFG_email_provider, 'resend'),
    CFG_email_poll_enabled = COALESCE(CFG_email_poll_enabled, false),
    CFG_email_poll_interval_seconds = COALESCE(CFG_email_poll_interval_seconds, 60)
WHERE TRUE;

ALTER TABLE configuration
    ALTER COLUMN CFG_email_provider SET DEFAULT 'resend',
    ALTER COLUMN CFG_email_poll_enabled SET DEFAULT false,
    ALTER COLUMN CFG_email_poll_interval_seconds SET DEFAULT 60;

ALTER TABLE configuration
    DROP CONSTRAINT IF EXISTS check_configuration_email_provider;

ALTER TABLE configuration
    ADD CONSTRAINT check_configuration_email_provider
        CHECK (CFG_email_provider IN ('resend'));

ALTER TABLE configuration
    DROP CONSTRAINT IF EXISTS check_configuration_email_poll_interval;

ALTER TABLE configuration
    ADD CONSTRAINT check_configuration_email_poll_interval
        CHECK (CFG_email_poll_interval_seconds >= 10);

COMMENT ON COLUMN configuration.CFG_github_app_id IS 'GitHub App numeric ID';
COMMENT ON COLUMN configuration.CFG_github_installation_id IS 'GitHub App installation ID';
COMMENT ON COLUMN configuration.CFG_github_client_id IS 'GitHub OAuth client ID';
COMMENT ON COLUMN configuration.CFG_github_client_secret IS 'GitHub OAuth client secret';
COMMENT ON COLUMN configuration.CFG_github_private_key IS 'GitHub App private key (PEM)';
COMMENT ON COLUMN configuration.CFG_email_provider IS 'Outbound/inbound email provider';
COMMENT ON COLUMN configuration.CFG_resend_api_key IS 'Resend API key';
COMMENT ON COLUMN configuration.CFG_email_from_name IS 'Default sender display name';
COMMENT ON COLUMN configuration.CFG_email_from_address IS 'Default sender email address';
COMMENT ON COLUMN configuration.CFG_email_inbound_address IS 'Inbound address used by the platform';
COMMENT ON COLUMN configuration.CFG_email_poll_enabled IS 'Whether the inbound poller is enabled';
COMMENT ON COLUMN configuration.CFG_email_poll_interval_seconds IS 'Inbound poll interval in seconds';

CREATE TABLE IF NOT EXISTS email (
    EML_id SERIAL PRIMARY KEY,
    EML_provider VARCHAR(20) NOT NULL,
    EML_provider_message_id VARCHAR(255) NOT NULL,
    EML_direction VARCHAR(20) NOT NULL,
    AGN_id INTEGER REFERENCES agent(AGN_id),
    EML_subject TEXT,
    EML_message_id_header TEXT,
    EML_in_reply_to_header TEXT,
    EML_references JSONB,
    EML_from_address VARCHAR(320),
    EML_from_name VARCHAR(255),
    EML_to_addresses JSONB NOT NULL DEFAULT '[]'::jsonb,
    EML_cc_addresses JSONB,
    EML_bcc_addresses JSONB,
    EML_text_body TEXT,
    EML_html_body TEXT,
    EML_raw_payload JSONB,
    EML_status VARCHAR(20) NOT NULL,
    EML_error_message TEXT,
    EML_provider_created_at TIMESTAMP,
    EML_created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    EML_updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT uq_email_provider_message_id UNIQUE (EML_provider_message_id),
    CONSTRAINT check_email_provider CHECK (EML_provider IN ('resend')),
    CONSTRAINT check_email_direction CHECK (EML_direction IN ('inbound', 'outbound')),
    CONSTRAINT check_email_status CHECK (EML_status IN ('received', 'sent', 'failed'))
);

COMMENT ON TABLE email IS 'Inbound and outbound email log for the platform';
COMMENT ON COLUMN email.EML_provider IS 'Email provider identifier';
COMMENT ON COLUMN email.EML_provider_message_id IS 'Provider-side unique message identifier';
COMMENT ON COLUMN email.EML_direction IS 'Inbound or outbound direction';
COMMENT ON COLUMN email.AGN_id IS 'Owning agent when applicable';
COMMENT ON COLUMN email.EML_subject IS 'Email subject';
COMMENT ON COLUMN email.EML_message_id_header IS 'RFC Message-ID header';
COMMENT ON COLUMN email.EML_in_reply_to_header IS 'RFC In-Reply-To header';
COMMENT ON COLUMN email.EML_references IS 'Parsed RFC References header';
COMMENT ON COLUMN email.EML_from_address IS 'Sender email address';
COMMENT ON COLUMN email.EML_from_name IS 'Sender display name';
COMMENT ON COLUMN email.EML_to_addresses IS 'Recipient list';
COMMENT ON COLUMN email.EML_cc_addresses IS 'CC recipients';
COMMENT ON COLUMN email.EML_bcc_addresses IS 'BCC recipients';
COMMENT ON COLUMN email.EML_text_body IS 'Plain text body';
COMMENT ON COLUMN email.EML_html_body IS 'HTML body';
COMMENT ON COLUMN email.EML_raw_payload IS 'Provider payload stored for debugging/recovery';
COMMENT ON COLUMN email.EML_status IS 'Delivery/import status';
COMMENT ON COLUMN email.EML_error_message IS 'Failure reason when status = failed';
COMMENT ON COLUMN email.EML_provider_created_at IS 'Timestamp assigned by provider';

CREATE INDEX IF NOT EXISTS idx_email_direction_created_at
    ON email (EML_direction, EML_created_at DESC);
CREATE INDEX IF NOT EXISTS idx_email_status_created_at
    ON email (EML_status, EML_created_at DESC);
CREATE INDEX IF NOT EXISTS idx_email_agent_created_at
    ON email (AGN_id, EML_created_at DESC);
CREATE INDEX IF NOT EXISTS idx_email_provider_created_at
    ON email (EML_provider_created_at DESC);

COMMIT;
