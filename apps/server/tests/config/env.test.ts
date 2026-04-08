import { describe, expect, it } from 'vitest';
import { loadEnv } from '../../src/shared/config/env.js';

describe('Environment configuration', () => {
  it('parses a valid environment shape', () => {
    const env = loadEnv({
      NODE_ENV: 'test',
      PORT: '4321',
      POSTGRES_CONNECTION_STRING: 'postgres://postgres:postgres@localhost:5432/zhc',
    });

    expect(env.NODE_ENV).toBe('test');
    expect(env.PORT).toBe(4321);
    expect(env.POSTGRES_CONNECTION_STRING).toContain('localhost');
  });

  it('fails when the connection string is missing', () => {
    expect(() =>
      loadEnv({
        NODE_ENV: 'test',
        PORT: '3000',
      }),
    ).toThrow();
  });
});
