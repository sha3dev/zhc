import type { z } from 'zod';

export const executionModes = ['unstructured', 'structured'] as const;
export type ExecutionMode = (typeof executionModes)[number];
export const promptBlockKinds = [
  'identity',
  'command',
  'memory',
  'context',
  'input',
  'static',
] as const;
export type PromptBlockKind = (typeof promptBlockKinds)[number];

export interface PromptBlock {
  content: string;
  key: string;
  kind: PromptBlockKind;
  title: string;
}

export interface MemoryBlock extends PromptBlock {
  key: string;
  kind: 'memory' | 'static';
  source: 'dynamic' | 'static';
}

export interface ExecutionRequest<TParsed = unknown> {
  agentId: number;
  context?: unknown;
  operationKey: string;
  outputSchema?: z.ZodType<TParsed>;
  sandboxMode?: 'read-only' | 'workspace-write' | 'danger-full-access';
  userInput: string;
  workingDirectory?: string;
}

export interface ExecutionResult<TParsed = unknown> {
  agentId: number;
  composedPrompt: string;
  cliId: string;
  durationMs: number;
  executedAt: string;
  id: number;
  model: string;
  promptBlocks: PromptBlock[];
  operationKey: string;
  parsedOutput: TParsed | null;
  promptPath: string;
  rawOutput: string;
  sandboxMode: 'read-only' | 'workspace-write' | 'danger-full-access';
  userInput: string;
  validationError: string | null;
  workingDirectory: string;
  context?: unknown;
}

export interface ExecutionErrorDetails {
  cliId?: string;
  model?: string;
  operationKey?: string;
}

export interface ExecutionSummary {
  agentId: number;
  agentName: string;
  cliId: string;
  durationMs: number;
  executedAt: Date;
  id: number;
  model: string;
  operationKey: string;
  promptPreview: string;
  responsePreview: string;
}

export interface ExecutionDetails extends ExecutionSummary {
  composedPrompt: string;
  context: unknown;
  parsedOutput: unknown;
  promptBlocks: PromptBlock[];
  promptPath: string;
  rawOutput: string;
  sandboxMode: 'read-only' | 'workspace-write' | 'danger-full-access';
  userInput: string;
  validationError: string | null;
  workingDirectory: string;
}

export interface PersistExecutionInput {
  agentId: number;
  cliId: string;
  composedPrompt: string;
  context: unknown;
  durationMs: number;
  executedAt: Date;
  model: string;
  operationKey: string;
  parsedOutput: unknown;
  promptBlocks: PromptBlock[];
  promptPath: string;
  rawOutput: string;
  sandboxMode: 'read-only' | 'workspace-write' | 'danger-full-access';
  userInput: string;
  validationError: string | null;
  workingDirectory: string;
}

export interface ExecutionRecord {
  agn_id: number;
  agent_name: string;
  exe_cli_id: string;
  exe_composed_prompt: string;
  exe_context_json: unknown;
  exe_created_at: Date;
  exe_duration_ms: number;
  exe_executed_at: Date;
  exe_id: number;
  exe_model: string;
  exe_operation_key: string;
  exe_parsed_output_json: unknown;
  exe_prompt_blocks_json: PromptBlock[];
  exe_prompt_path: string;
  exe_raw_output: string;
  exe_sandbox_mode: 'read-only' | 'workspace-write' | 'danger-full-access';
  exe_user_input: string;
  exe_validation_error: string | null;
  exe_working_directory: string;
  prompt_preview: string;
  response_preview: string;
}
