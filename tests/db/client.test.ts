import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { closeDatabase, query, testConnection, transaction } from '../../src/db/client.js';

describe('Database Client', () => {
  afterEach(async () => {
    await closeDatabase();
  });

  describe('testConnection', () => {
    it('should successfully connect to the database', async () => {
      await expect(testConnection()).resolves.not.toThrow();
    });
  });

  describe('query', () => {
    it('should execute a simple query', async () => {
      const result = await query('SELECT NOW() as now');
      expect(result.rows).toHaveLength(1);
      expect(result.rows[0]).toHaveProperty('now');
    });

    it('should execute a query with parameters', async () => {
      const result = await query('SELECT $1::text as message', ['Hello, PostgreSQL!']);
      expect(result.rows).toHaveLength(1);
      expect(result.rows[0].message).toBe('Hello, PostgreSQL!');
    });
  });

  describe('transaction', () => {
    it('should commit a successful transaction', async () => {
      const result = await transaction(async (client) => {
        const res = await client.query('SELECT $1::text as message', ['Transaction test']);
        return res.rows[0].message;
      });

      expect(result).toBe('Transaction test');
    });

    it('should rollback a failed transaction', async () => {
      await expect(
        transaction(async (client) => {
          await client.query('SELECT 1');
          throw new Error('Transaction failed');
        }),
      ).rejects.toThrow('Transaction failed');
    });
  });
});
