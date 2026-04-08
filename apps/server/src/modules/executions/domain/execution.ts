import type { z } from 'zod';

export const executionModes = ['unstructured', 'structured'] as const;
export type ExecutionMode = (typeof executionModes)[number];
export const promptBlockKinds = ['identity', 'command', 'memory', 'context', 'input', 'static'] as const;
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
  composedPrompt: string;
  cliId: string;
  durationMs: number;
  executedAt: string;
  model: string;
  promptBlocks: PromptBlock[];
  operationKey: string;
  parsedOutput: TParsed | null;
  promptPath: string;
  rawOutput: string;
  validationError: string | null;
}

export interface ExecutionErrorDetails {
  cliId?: string;
  model?: string;
  operationKey?: string;
}
