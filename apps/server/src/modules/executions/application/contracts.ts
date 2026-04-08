import type { Agent, AgentMemorySummary } from '../../agents/domain/agent.js';
import type { CliToolStatus } from '../../tools/index.js';
import type { MemoryBlock } from '../domain/execution.js';

export interface PromptAsset {
  operationKey: string;
  path: string;
  systemPrompt: string;
}

export interface PromptFragment {
  content: string;
  key: string;
  path: string;
}

export interface ExecutionOperationDefinition<TParsed = unknown> {
  memoryKeys?: string[];
  operationKey: string;
  staticFragments?: string[];
  outputSchema?: import('zod').ZodType<TParsed>;
}

export interface AgentLookup {
  getById(id: number): Promise<Agent>;
  listForMemory(): Promise<AgentMemorySummary[]>;
}

export interface ToolStatusLookup {
  listStatus(): Promise<{ cachedAt: string | null; items: CliToolStatus[] }>;
}

export interface PromptRegistry {
  getFragment(key: string): Promise<PromptFragment>;
  get(operationKey: string): Promise<PromptAsset>;
}

export interface MemoryBuildInput {
  agent: Agent;
  context?: unknown;
  operationKey: string;
  userInput: string;
}

export interface MemoryProvider {
  build(input: MemoryBuildInput, memoryKeys: string[]): Promise<MemoryBlock[]>;
}

export interface ModelRunRequest {
  cliId: string;
  model: string;
  prompt: string;
  sandboxMode: 'read-only' | 'workspace-write' | 'danger-full-access';
  workingDirectory: string;
}

export interface ModelRunResponse {
  rawOutput: string;
}

export interface ModelRunner {
  readonly cliId: string;
  run(input: ModelRunRequest): Promise<ModelRunResponse>;
}
