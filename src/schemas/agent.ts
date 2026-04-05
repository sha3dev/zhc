import { z } from 'zod';

/**
 * Supported AI models enum
 */
export const AgentModelSchema = z.enum([
  'claude-opus-4-6',
  'claude-sonnet-4-6',
  'claude-haiku-4-5',
  'gpt-4',
  'gpt-4-turbo',
  'gpt-4o',
  'o1-preview',
  'o1-mini',
  'deepseek-chat',
  'deepseek-coder',
]);

/**
 * Agent status enum
 */
export const AgentStatusSchema = z.enum(['active', 'inactive', 'archived']);

/**
 * Schema for creating a new agent
 */
export const CreateAgentSchema = z.object({
  name: z
    .string()
    .min(1, 'Agent name is required')
    .max(255, 'Agent name must be less than 255 characters')
    .regex(
      /^[a-zA-Z0-9\s\-_]+$/,
      'Agent name can only contain letters, numbers, spaces, hyphens, and underscores',
    ),
  soul: z
    .string()
    .min(50, 'Soul must be at least 50 characters')
    .max(100000, 'Soul must be less than 100,000 characters'),
  model: AgentModelSchema,
  reportsToId: z.number().int().positive().optional(),
  status: AgentStatusSchema.optional(),
});

/**
 * Schema for updating an existing agent
 */
export const UpdateAgentSchema = z
  .object({
    name: z
      .string()
      .min(1, 'Agent name is required')
      .max(255, 'Agent name must be less than 255 characters')
      .regex(
        /^[a-zA-Z0-9\s\-_]+$/,
        'Agent name can only contain letters, numbers, spaces, hyphens, and underscores',
      )
      .optional(),
    soul: z
      .string()
      .min(50, 'Soul must be at least 50 characters')
      .max(100000, 'Soul must be less than 100,000 characters')
      .optional(),
    model: AgentModelSchema.optional(),
    reportsToId: z.number().int().positive().nullable().optional(),
    status: AgentStatusSchema.optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: 'At least one field must be provided for update',
  });

/**
 * Schema for agent query parameters
 */
export const AgentQueryParamsSchema = z.object({
  status: AgentStatusSchema.optional(),
  model: AgentModelSchema.optional(),
  reportsToId: z.coerce.number().int().positive().nullable().optional(),
  search: z.string().max(255).optional(),
  offset: z.coerce.number().int().min(0).default(0),
  limit: z.coerce.number().int().positive().max(100).default(20),
});

/**
 * Database entity schema (for validation from DB)
 */
export const AgentEntitySchema = z.object({
  agn_id: z.number().int().positive(),
  agn_name: z.string().max(255),
  agn_soul: z.string().max(100000),
  agn_model: AgentModelSchema,
  agn_reports_to_agn_id: z.number().int().positive().nullable(),
  agn_status: AgentStatusSchema,
  agn_created_at: z.coerce.date(),
  agn_updated_at: z.coerce.date(),
});

/**
 * Response DTO schema
 */
export const AgentResponseDTOSchema = z.object({
  id: z.number().int().positive(),
  name: z.string().max(255),
  soul: z.string().max(100000),
  model: AgentModelSchema,
  reportsToId: z.number().int().positive().nullable().optional(),
  reportsToName: z.string().max(255).nullable().optional(),
  managesIds: z.array(z.number().int().positive()),
  status: AgentStatusSchema,
  createdAt: z.date(),
  updatedAt: z.date(),
});

/**
 * Agent hierarchy node schema
 */
export const AgentHierarchyNodeSchema: z.ZodType<{
  id: number;
  name: string;
  role?: string;
  status: z.infer<typeof AgentStatusSchema>;
  children: Array<unknown>;
}> = z.lazy(() =>
  z.object({
    id: z.number().int().positive(),
    name: z.string().max(255),
    role: z.string().max(255).optional(),
    status: AgentStatusSchema,
    children: z.array(AgentHierarchyNodeSchema),
  }),
);

/**
 * Type exports
 */
export type CreateAgentInput = z.infer<typeof CreateAgentSchema>;
export type UpdateAgentInput = z.infer<typeof UpdateAgentSchema>;
export type AgentQueryParamsInput = z.infer<typeof AgentQueryParamsSchema>;
