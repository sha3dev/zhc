import { z } from 'zod';
import type {
  ExecutionDetails,
  ExecutionResult,
  ExecutionSummary,
  PersistExecutionInput,
} from '../domain/execution.js';

export const sandboxModeSchema = z.enum(['read-only', 'workspace-write', 'danger-full-access']);

export const listExecutionsQuerySchema = z.object({
  agentId: z.coerce.number().int().positive().optional(),
  cliId: z.string().trim().max(100).optional(),
  limit: z.coerce.number().int().positive().max(100).default(20),
  model: z.string().trim().max(100).optional(),
  offset: z.coerce.number().int().min(0).default(0),
  operationKey: z.string().trim().max(100).optional(),
  search: z.string().trim().max(255).optional(),
});

export type ListExecutionsQuery = z.infer<typeof listExecutionsQuerySchema>;

export interface ExecutionListResult {
  executions: ExecutionSummary[];
  total: number;
}

export interface ExecutionsRepository {
  create(input: PersistExecutionInput): Promise<ExecutionDetails>;
  findById(id: number): Promise<ExecutionDetails | null>;
  list(query: ListExecutionsQuery): Promise<ExecutionListResult>;
}

export interface ExecutionReadService {
  getById(id: number): Promise<ExecutionDetails>;
  list(query: ListExecutionsQuery): Promise<ExecutionListResult>;
}

export type ExecutionApiResult<TParsed = unknown> = ExecutionResult<TParsed>;
