import { Pool, type PoolClient, type QueryResult, type QueryResultRow } from 'pg';
import { env } from '../config/env.js';
import { InfrastructureError } from '../errors/app-error.js';
import { logger } from '../observability/logger.js';

let pool: Pool | undefined;

export function getPool(): Pool {
  if (!pool) {
    pool = new Pool({
      connectionString: env.POSTGRES_CONNECTION_STRING,
      connectionTimeoutMillis: 2000,
      idleTimeoutMillis: 30000,
      max: 20,
    });

    pool.on('error', (error) => {
      logger.error('Unexpected database pool error', { error });
    });
  }

  return pool;
}

export async function query<T extends QueryResultRow = Record<string, unknown>>(
  text: string,
  params: readonly unknown[] = [],
): Promise<QueryResult<T>> {
  try {
    return await getPool().query<T>(text, [...params]);
  } catch (error) {
    throw new InfrastructureError('Database query failed', { cause: error, details: { text } });
  }
}

export async function getClient(): Promise<PoolClient> {
  try {
    return await getPool().connect();
  } catch (error) {
    throw new InfrastructureError('Database connection failed', { cause: error });
  }
}

export async function transaction<T>(callback: (client: PoolClient) => Promise<T>): Promise<T> {
  const client = await getClient();

  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

export async function closeDatabase(): Promise<void> {
  if (pool) {
    await pool.end();
    pool = undefined;
  }
}

export async function testConnection(): Promise<void> {
  await query('SELECT 1');
}
