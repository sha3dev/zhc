import type { ExecutionDetails, ExecutionRecord, ExecutionSummary } from '../domain/execution.js';

export function createExecutionPreview(content: string, maxLength = 140): string {
  const normalized = content.replace(/\s+/g, ' ').trim();
  if (normalized.length <= maxLength) {
    return normalized;
  }

  return `${normalized.slice(0, Math.max(0, maxLength - 1)).trimEnd()}…`;
}

export function toExecutionSummary(record: ExecutionRecord): ExecutionSummary {
  return {
    agentId: record.actor_id,
    agentName: record.actor_name,
    cliId: record.exe_cli_id,
    durationMs: record.exe_duration_ms,
    executedAt: record.exe_executed_at,
    id: record.exe_id,
    model: record.exe_model,
    operationKey: record.exe_operation_key,
    promptPreview: record.prompt_preview || createExecutionPreview(record.exe_composed_prompt),
    responsePreview: record.response_preview || createExecutionPreview(record.exe_raw_output),
  };
}

export function toExecutionDetails(record: ExecutionRecord): ExecutionDetails {
  return {
    ...toExecutionSummary(record),
    composedPrompt: record.exe_composed_prompt,
    context: record.exe_context_json ?? null,
    parsedOutput: record.exe_parsed_output_json ?? null,
    promptBlocks: record.exe_prompt_blocks_json ?? [],
    promptPath: record.exe_prompt_path,
    rawOutput: record.exe_raw_output,
    sandboxMode: record.exe_sandbox_mode,
    userInput: record.exe_user_input,
    validationError: record.exe_validation_error,
    workingDirectory: record.exe_working_directory,
  };
}
