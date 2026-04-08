import { describe, expect, it } from 'vitest';
import {
  createAgentInputSchema,
  listAgentsQuerySchema,
  updateAgentInputSchema,
} from '../../../src/modules/agents/application/contracts.js';

describe('Agent contracts', () => {
  it('accepts valid create input with a model', () => {
    const result = createAgentInputSchema.safeParse({
      modelCliId: 'claude_code',
      model: 'claude-sonnet-4-6',
      name: 'Frontend Developer',
      soul: '# Role\nFrontend Developer\n\n## Personality\n- Careful\n- Clear\n- Fast enough',
      status: 'ready',
    });

    expect(result.success).toBe(true);
  });

  it('accepts create input with no model (not_ready)', () => {
    const result = createAgentInputSchema.safeParse({
      name: 'Frontend Developer',
      soul: '# Role\nFrontend Developer\n\n## Personality\n- Careful\n- Clear\n- Fast enough',
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.modelCliId).toBeNull();
      expect(result.data.model).toBeNull();
      expect(result.data.status).toBe('not_ready');
    }
  });

  it('rejects partial model selections', () => {
    const result = createAgentInputSchema.safeParse({
      model: 'gpt-5.4',
      name: 'Frontend Developer',
      soul: '# Role\nFrontend Developer\n\n## Personality\n- Careful\n- Clear\n- Fast enough',
    });

    expect(result.success).toBe(false);
  });

  it('rejects empty patch payloads', () => {
    const result = updateAgentInputSchema.safeParse({});
    expect(result.success).toBe(false);
  });

  it('coerces list query pagination', () => {
    const result = listAgentsQuerySchema.parse({
      limit: '10',
      offset: '5',
    });

    expect(result.limit).toBe(10);
    expect(result.offset).toBe(5);
  });
});
