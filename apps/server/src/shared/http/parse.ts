import type { Context } from 'hono';
import { type ZodTypeAny, z } from 'zod';

export async function parseJson<TSchema extends ZodTypeAny>(
  context: Context,
  schema: TSchema,
): Promise<z.output<TSchema>> {
  const payload = await context.req.json();
  return schema.parse(payload);
}

export function parseParams<TSchema extends ZodTypeAny>(
  context: Context,
  schema: TSchema,
): z.output<TSchema> {
  return schema.parse(context.req.param());
}

export function parseQuery<TSchema extends ZodTypeAny>(
  context: Context,
  schema: TSchema,
): z.output<TSchema> {
  return schema.parse(context.req.query());
}

export const idParamSchema = z.object({
  id: z.coerce.number().int().positive(),
});
