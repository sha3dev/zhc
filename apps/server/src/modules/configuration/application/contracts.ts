import { z } from 'zod';
import type { Configuration, InternalConfiguration } from '../domain/configuration.js';

const optionalTrimmedStringSchema = z.string().trim().max(10_000).nullable().optional();
const optionalTrimmedShortStringSchema = z.string().trim().max(255).nullable().optional();

export const updateConfigurationInputSchema = z
  .object({
    dokku: z
      .object({
        host: optionalTrimmedShortStringSchema,
        port: z.coerce.number().int().positive().max(65535).nullable().optional(),
        sshUser: optionalTrimmedShortStringSchema,
      })
      .optional(),
    email: z
      .object({
        fromAddress: optionalTrimmedShortStringSchema,
        fromName: optionalTrimmedShortStringSchema,
        inboundAddress: optionalTrimmedShortStringSchema,
        pollEnabled: z.boolean().optional(),
        pollIntervalSeconds: z.coerce.number().int().min(10).max(86400).optional(),
        resendApiKey: z.string().max(10_000).optional(),
      })
      .optional(),
    github: z
      .object({
        appId: optionalTrimmedShortStringSchema,
        clientId: optionalTrimmedShortStringSchema,
        clientSecret: z.string().max(10_000).optional(),
        installationId: optionalTrimmedShortStringSchema,
        privateKey: optionalTrimmedStringSchema,
      })
      .optional(),
    human: z
      .object({
        email: optionalTrimmedShortStringSchema,
      })
      .optional(),
    steel: z
      .object({
        apiKey: z.string().max(10_000).optional(),
      })
      .optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: 'At least one field must be provided',
  });

export type UpdateConfigurationInput = z.infer<typeof updateConfigurationInputSchema>;

export interface ConfigurationRepository {
  get(): Promise<InternalConfiguration>;
  update(input: UpdateConfigurationInput): Promise<InternalConfiguration>;
}

export interface ConfigurationReader {
  get(): Promise<Configuration>;
  getInternal(): Promise<InternalConfiguration>;
  update(input: UpdateConfigurationInput): Promise<Configuration>;
}
