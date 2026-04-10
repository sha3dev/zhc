import { z } from 'zod';
import {
  type Agent,
  type AgentDetails,
  type AgentHierarchyNode,
  type AgentMemorySummary,
  type AgentStats,
  agentKindSchema,
  agentModelCliIdSchema,
  agentModelSchema,
  agentStatusSchema,
} from '../domain/agent.js';

const agentModelSelectionShape = z
  .object({
    model: agentModelSchema,
    modelCliId: agentModelCliIdSchema,
  })
  .strict();

function addModelSelectionValidation<
  T extends z.ZodType<{
    model?: string | null;
    modelCliId?: string | null;
  }>,
>(schema: T): T {
  return schema.superRefine((value, context) => {
    const touchesModel = 'model' in value || 'modelCliId' in value;
    if (!touchesModel) {
      return;
    }

    const hasModel = value.model !== null && value.model !== undefined;
    const hasModelCliId = value.modelCliId !== null && value.modelCliId !== undefined;
    const clearsBoth = value.model === null && value.modelCliId === null;

    if (!clearsBoth && hasModel !== hasModelCliId) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'model and modelCliId must be provided together',
        path: hasModel ? ['modelCliId'] : ['model'],
      });
      return;
    }

    if (hasModel && hasModelCliId) {
      const parsedSelection = agentModelSelectionShape.safeParse({
        model: value.model,
        modelCliId: value.modelCliId,
      });
      if (!parsedSelection.success) {
        for (const issue of parsedSelection.error.issues) {
          context.addIssue(issue);
        }
      }
    }
  }) as unknown as T;
}

const createAgentInputBaseSchema = z.object({
  isCeo: z.boolean().default(false),
  kind: agentKindSchema.default('specialist'),
  key: z
    .string()
    .trim()
    .min(1)
    .max(100)
    .regex(/^[a-z0-9][a-z0-9-]*$/)
    .optional(),
  modelCliId: agentModelCliIdSchema.nullable().default(null),
  model: agentModelSchema.nullable().default(null),
  name: z
    .string()
    .trim()
    .min(1)
    .max(255)
    .regex(/^[a-zA-Z0-9\s\-_]+$/),
  subagentMd: z.string().trim().min(50).max(100000),
  status: agentStatusSchema.default('not_ready'),
});

export const createAgentInputSchema = addModelSelectionValidation(
  createAgentInputBaseSchema,
).superRefine((value, context) => {
  if (value.isCeo && value.kind !== 'ceo') {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'CEO agents must use kind=ceo',
      path: ['kind'],
    });
  }

  if (!value.isCeo && value.kind === 'ceo') {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Only the CEO can use kind=ceo',
      path: ['kind'],
    });
  }
});

export const updateAgentInputSchema = addModelSelectionValidation(
  createAgentInputBaseSchema.partial().omit({ isCeo: true, key: true }),
).refine((value) => Object.keys(value).length > 0, {
  message: 'At least one field must be provided',
});

export const listAgentsQuerySchema = z.object({
  limit: z.coerce.number().int().positive().max(100).default(20),
  model: agentModelSchema.optional(),
  offset: z.coerce.number().int().min(0).default(0),
  search: z.string().trim().max(255).optional(),
  status: agentStatusSchema.optional(),
});

export type CreateAgentInput = z.infer<typeof createAgentInputSchema>;
export type UpdateAgentInput = z.infer<typeof updateAgentInputSchema>;
export type ListAgentsQuery = z.infer<typeof listAgentsQuerySchema> & {
  kinds?: Array<z.infer<typeof agentKindSchema>>;
};

export interface AgentsRepository {
  archive(id: number): Promise<boolean>;
  count(): Promise<number>;
  create(input: CreateAgentInput): Promise<Agent>;
  findAll(query: ListAgentsQuery): Promise<{ agents: Agent[]; total: number }>;
  findCeo(): Promise<Agent | null>;
  findById(id: number): Promise<Agent | null>;
  findByIdWithRelations(id: number): Promise<AgentDetails | null>;
  findForMemory(): Promise<AgentMemorySummary[]>;
  getHierarchy(): Promise<AgentHierarchyNode[]>;
  getStats(): Promise<AgentStats>;
  update(id: number, input: UpdateAgentInput): Promise<Agent | null>;
}
