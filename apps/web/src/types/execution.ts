import type { PromptBlock } from './execution-prompt';

export interface ExecutionSummary {
  agentId: number;
  agentName: string;
  cliId: string;
  durationMs: number;
  executedAt: string;
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

export interface ListExecutionsResponse {
  items: ExecutionSummary[];
  limit: number;
  offset: number;
  total: number;
}
