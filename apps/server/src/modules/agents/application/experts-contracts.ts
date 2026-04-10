import { z } from 'zod';
import type {
  Expert,
  ExpertDetails,
  ExpertSummary,
  RegistryEntityMemorySummary,
  RuntimeActor,
} from '../domain/expert.js';

export const createExpertInputSchema = z.object({
  key: z
    .string()
    .trim()
    .min(1)
    .max(100)
    .regex(/^[a-z0-9][a-z0-9-]*$/)
    .optional(),
  name: z
    .string()
    .trim()
    .min(1)
    .max(255)
    .regex(/^[a-zA-Z0-9\s\-_]+$/),
  subagentMd: z.string().trim().min(50).max(100000),
});

export const updateExpertInputSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(1)
      .max(255)
      .regex(/^[a-zA-Z0-9\s\-_]+$/)
      .optional(),
    subagentMd: z.string().trim().min(50).max(100000).optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: 'At least one field must be provided',
  });

export const listExpertsQuerySchema = z.object({
  limit: z.coerce.number().int().positive().max(100).default(20),
  offset: z.coerce.number().int().min(0).default(0),
  search: z.string().trim().max(255).optional(),
});

export type CreateExpertInput = z.infer<typeof createExpertInputSchema>;
export type UpdateExpertInput = z.infer<typeof updateExpertInputSchema>;
export type ListExpertsQuery = z.infer<typeof listExpertsQuerySchema>;

export interface ExpertsRepository {
  archive(id: number): Promise<boolean>;
  create(input: CreateExpertInput): Promise<Expert>;
  findAll(query: ListExpertsQuery): Promise<{ experts: Expert[]; total: number }>;
  findById(id: number): Promise<Expert | null>;
  findByIdWithRelations(id: number): Promise<ExpertDetails | null>;
  findForMemory(ceo: RuntimeActor | null): Promise<RegistryEntityMemorySummary[]>;
  findRuntimeActorById(id: number, ceo: RuntimeActor | null): Promise<RuntimeActor | null>;
  update(id: number, input: UpdateExpertInput): Promise<Expert | null>;
}

export interface ExpertListingResult {
  experts: ExpertSummary[];
  total: number;
}
