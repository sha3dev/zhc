import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';

import { z } from 'zod';

const currentDir = dirname(fileURLToPath(import.meta.url));
const envCandidates = [resolve(process.cwd(), '.env'), resolve(currentDir, '../../../../../.env')];

for (const path of envCandidates) {
  dotenv.config({ path, override: false });
}

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().int().positive().default(3000),
  POSTGRES_CONNECTION_STRING: z.string().min(1),
});

export type Env = z.infer<typeof envSchema>;

export function loadEnv(source: NodeJS.ProcessEnv = process.env): Env {
  return envSchema.parse(source);
}

let cachedEnv: Env | null = null;

export function getEnv(source: NodeJS.ProcessEnv = process.env): Env {
  cachedEnv ??= Object.freeze(loadEnv(source));
  return cachedEnv;
}

export const env = new Proxy({} as Env, {
  get(_target, property) {
    return getEnv()[property as keyof Env];
  },
});
