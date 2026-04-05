import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { z } from 'zod';

/**
 * Schema for environment variables
 */
const envSchema = z.object({
  POSTGRES_CONNECTION_STRING: z.string().url().min(1),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.string().transform(Number).default('3000'),
});

/**
 * Type for validated environment variables
 */
export type Env = z.infer<typeof envSchema>;

/**
 * Load and validate environment variables
 *
 * @throws {Error} If environment variables are invalid or missing
 * @returns Validated environment variables
 */
function loadEnv(): Env {
  // Load .env file if it exists
  try {
    const envPath = resolve(process.cwd(), '.env');
    const envContent = readFileSync(envPath, 'utf-8');

    for (const line of envContent.split('\n')) {
      const trimmedLine = line.trim();
      if (trimmedLine && !trimmedLine.startsWith('#')) {
        const [key, ...valueParts] = trimmedLine.split('=');
        const value = valueParts.join('=').trim();
        if (key && value) {
          process.env[key] = value;
        }
      }
    }
  } catch {
    // .env file not found, use system environment variables
  }

  // Validate and parse environment variables
  return envSchema.parse(process.env);
}

/**
 * Application configuration
 */
export const config = Object.freeze(loadEnv());

/**
 * Get configuration value
 *
 * @param key - Configuration key
 * @returns Configuration value
 */
export function getConfig<K extends keyof Env>(key: K): Env[K] {
  return config[key];
}
