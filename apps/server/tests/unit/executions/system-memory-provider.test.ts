import { describe, expect, it, vi } from 'vitest';
import { SystemMemoryProvider } from '../../../src/modules/executions/infrastructure/system-memory.provider.js';

describe('SystemMemoryProvider', () => {
  it('builds available_agents from agent read data', async () => {
    const provider = new SystemMemoryProvider({
      listForMemory: vi.fn(async () => [
        {
          id: 1,
          isCeo: true,
          key: 'ceo',
          modelCliId: 'codex',
          model: 'gpt-5.4',
          name: 'CEO',
          role: 'Chief Executive Officer',
          status: 'ready',
        },
      ]),
    });

    const blocks = await provider.build(
      {
        agent: {
          createdAt: new Date(),
          id: 1,
          isCeo: true,
          key: 'ceo',
          modelCliId: 'codex',
          model: 'gpt-5.4',
          name: 'CEO',
          soul: '# CEO',
          status: 'ready',
          updatedAt: new Date(),
        },
        operationKey: 'create-project',
        userInput: 'build app',
      },
      ['available_agents'],
    );

    expect(blocks).toHaveLength(1);
    expect(blocks[0]?.content).toContain('"key": "ceo"');
    expect(blocks[0]?.content).toContain('"modelCliId": "codex"');
    expect(blocks[0]?.content).toContain('"role": "Chief Executive Officer"');
  });

  it('returns no blocks when no requested memory is supported', async () => {
    const provider = new SystemMemoryProvider({
      listForMemory: vi.fn(async () => []),
    });

    const blocks = await provider.build(
      {
        agent: {
          createdAt: new Date(),
          id: 1,
          isCeo: true,
          key: 'ceo',
          modelCliId: 'codex',
          model: 'gpt-5.4',
          name: 'CEO',
          soul: '# CEO',
          status: 'ready',
          updatedAt: new Date(),
        },
        operationKey: 'freeform-note',
        userInput: 'hello',
      },
      [],
    );

    expect(blocks).toEqual([]);
  });
});
