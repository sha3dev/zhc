import { Pool, type PoolClient, type QueryResult, type QueryResultRow } from 'pg';
import { getConfig } from '../config/config.js';

/**
 * PostgreSQL connection pool
 */
let pool: Pool | undefined = undefined;

/**
 * Get or create the database connection pool
 *
 * @returns PostgreSQL connection pool
 */
export function getPool(): Pool {
  if (!pool) {
    pool = new Pool({
      connectionString: getConfig('POSTGRES_CONNECTION_STRING'),
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
    });

    // Handle pool errors
    pool.on('error', (error) => {
      console.error('Unexpected error on idle client', error);
      process.exit(-1);
    });
  }

  return pool;
}

/**
 * Execute a SQL query
 *
 * @param query - SQL query string
 * @param params - Query parameters
 * @returns Query result
 */
export async function query<T extends QueryResultRow = Record<string, unknown>>(
  query: string,
  params?: unknown[],
): Promise<QueryResult<T>> {
  const pool = getPool();
  return pool.query<T>(query, params);
}

/**
 * Get a client from the pool for transactions
 *
 * @returns Pool client
 */
export async function getClient(): Promise<PoolClient> {
  const pool = getPool();
  return pool.connect();
}

/**
 * Execute a transaction
 *
 * @param callback - Transaction callback function
 * @returns Transaction result
 */
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

/**
 * Close all database connections
 *
 * @returns Promise that resolves when all connections are closed
 */
export async function closeDatabase(): Promise<void> {
  if (pool) {
    await pool.end();
    pool = undefined;
  }
}

/**
 * Test database connection
 *
 * @returns Promise that resolves if connection is successful
 */
export async function testConnection(): Promise<void> {
  const result = await query('SELECT NOW()');
  console.info('Database connected successfully:', result.rows[0]);
}
