BEGIN;

CREATE TABLE execution (
    exe_id SERIAL PRIMARY KEY,
    agn_id INTEGER NOT NULL REFERENCES agent(agn_id),
    exe_operation_key VARCHAR(100) NOT NULL,
    exe_cli_id VARCHAR(100) NOT NULL,
    exe_model VARCHAR(100) NOT NULL,
    exe_prompt_path TEXT NOT NULL,
    exe_composed_prompt TEXT NOT NULL,
    exe_prompt_blocks_json JSONB NOT NULL,
    exe_raw_output TEXT NOT NULL,
    exe_parsed_output_json JSONB,
    exe_validation_error TEXT,
    exe_duration_ms INTEGER NOT NULL,
    exe_working_directory TEXT NOT NULL,
    exe_sandbox_mode VARCHAR(32) NOT NULL,
    exe_context_json JSONB,
    exe_user_input TEXT NOT NULL,
    exe_executed_at TIMESTAMP NOT NULL,
    exe_created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT check_exe_sandbox_mode CHECK (exe_sandbox_mode IN ('read-only', 'workspace-write', 'danger-full-access'))
);

CREATE INDEX idx_execution_agn_id ON execution (agn_id);
CREATE INDEX idx_execution_exe_operation_key ON execution (exe_operation_key);
CREATE INDEX idx_execution_exe_executed_at_desc ON execution (exe_executed_at DESC);
CREATE INDEX idx_execution_exe_cli_id_exe_model ON execution (exe_cli_id, exe_model);

COMMENT ON TABLE execution IS 'Historical record of model executions';
COMMENT ON COLUMN execution.exe_prompt_blocks_json IS 'JSON array with structured prompt blocks';
COMMENT ON COLUMN execution.exe_parsed_output_json IS 'Parsed output when validation succeeds';
COMMENT ON COLUMN execution.exe_context_json IS 'Execution context payload';

COMMIT;
