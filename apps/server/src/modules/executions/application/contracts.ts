import type { RegistryEntityMemorySummary, RuntimeActor } from '../../agents/domain/expert.js';
import type { CliToolStatus } from '../../tools/index.js';
import type { MemoryBlock } from '../domain/execution.js';
import type { ExecutionsRepository } from './execution-contracts.js';

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

export interface SkillAsset {
  content: string;
  key: string;
  path: string;
}

export interface ExecutionOperationDefinition<TParsed = unknown> {
  memoryKeys?: string[];
  operationKey: string;
  skillKeys?: string[];
  staticFragments?: string[];
  outputSchema?: import('zod').ZodType<TParsed>;
}

export interface AgentLookup {
  getById(id: number): Promise<RuntimeActor>;
  listForMemory(): Promise<RegistryEntityMemorySummary[]>;
}

export interface ToolStatusLookup {
  listStatus(): Promise<{ cachedAt: string | null; items: CliToolStatus[] }>;
}

export interface PromptRegistry {
  getFragment(key: string): Promise<PromptFragment>;
  get(operationKey: string): Promise<PromptAsset>;
}

export interface SkillRegistry {
  getMany(keys: string[]): Promise<SkillAsset[]>;
}

export interface MemoryBuildInput {
  agent: RuntimeActor;
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

export interface ExecutionRepositoryLookup extends ExecutionsRepository {}
