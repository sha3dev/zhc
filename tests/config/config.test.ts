import { describe, expect, it } from 'vitest';
import { config, getConfig } from '../../src/config/config.js';

describe('Configuration', () => {
  it('should have all required environment variables', () => {
    expect(config).toHaveProperty('POSTGRES_CONNECTION_STRING');
    expect(config).toHaveProperty('NODE_ENV');
    expect(config).toHaveProperty('PORT');
  });

  it('should return correct configuration value', () => {
    const postgresUrl = getConfig('POSTGRES_CONNECTION_STRING');
    expect(postgresUrl).toBe('postgres://postgres:postgres@34.22.252.125/zhc');
  });

  it('should have valid NODE_ENV', () => {
    const nodeEnv = getConfig('NODE_ENV');
    expect(['development', 'production', 'test']).toContain(nodeEnv);
  });

  it('should have valid PORT', () => {
    const port = getConfig('PORT');
    expect(port).toBe(3000);
  });

  it('should have valid PostgreSQL connection string', () => {
    const connectionString = getConfig('POSTGRES_CONNECTION_STRING');
    expect(connectionString).toMatch(/^postgres:\/\/.+:.+@.+:?\d*\/.+$/);
  });
});
