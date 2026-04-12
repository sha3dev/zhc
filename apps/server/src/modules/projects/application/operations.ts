import { z } from 'zod';

const agentKeySchema = z
  .string()
  .trim()
  .min(1)
  .max(100)
  .regex(/^[a-z0-9][a-z0-9-]*$/);

const taskKeySchema = z
  .string()
  .trim()
  .min(1)
  .max(100)
  .regex(/^[a-z0-9][a-z0-9-_]*$/);

const artifactPathSchema = z
  .string()
  .trim()
  .min(1)
  .max(255)
  .regex(/^(?!\/)(?!.*\.\.)(?:[a-zA-Z0-9._-]+\/)*[a-zA-Z0-9._-]+$/);

export const createProjectOperationOutputSchema = z.object({
  definitionBrief: z.string().trim().min(1),
  name: z.string().trim().min(1).max(255),
  supportArtifacts: z
    .array(
      z.object({
        content: z.string().trim().min(1),
        path: artifactPathSchema,
        title: z.string().trim().min(1).max(255),
      }),
    )
    .min(1),
  tasks: z
    .array(
      z.object({
        acceptanceCriteria: z.array(z.string().trim().min(1)).min(1),
        assignedToAgentId: z.number().int().positive().nullable().optional(),
        assignedToAgentKey: agentKeySchema.optional(),
        dependsOnTaskKeys: z.array(taskKeySchema).default([]),
        description: z.string().trim().min(1),
        deliverable: z.string().trim().min(1),
        implementationNotes: z.array(z.string().trim().min(1)).default([]),
        key: taskKeySchema,
        sort: z.number().int().min(0),
        title: z.string().trim().min(1).max(500),
      }).refine((task) => Boolean(task.assignedToAgentId || task.assignedToAgentKey), {
        message: 'Each task must define assignedToAgentId or assignedToAgentKey',
      }),
    )
    .min(1),
});

export type CreateProjectOperationOutput = z.infer<typeof createProjectOperationOutputSchema>;
