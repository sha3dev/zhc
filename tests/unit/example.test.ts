import { describe, expect, it } from 'vitest';

describe('Example test suite', () => {
  it('should pass a basic test', () => {
    expect(true).toBe(true);
  });

  it('should demonstrate async testing', async () => {
    const result = await Promise.resolve(42);
    expect(result).toBe(42);
  });
});
