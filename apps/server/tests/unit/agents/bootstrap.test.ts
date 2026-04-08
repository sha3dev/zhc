import { describe, expect, it, vi } from 'vitest';
import { bootstrapDefaultAgents } from '../../../src/modules/agents/application/bootstrap.js';
import type { AgentsRepository } from '../../../src/modules/agents/application/contracts.js';
import type { Agent } from '../../../src/modules/agents/domain/agent.js';
import { defaultAgentNames } from '../../../src/modules/agents/domain/default-agents.js';

const createRepository = (): AgentsRepository => ({
  archive: vi.fn(),
  count: vi.fn(),
  create: vi.fn(),
  findAll: vi.fn(),
  findById: vi.fn(),
  findByIdWithRelations: vi.fn(),
  findForMemory: vi.fn(),
  getHierarchy: vi.fn(),
  getStats: vi.fn(),
  update: vi.fn(),
});

const fakeAgent = (id: number, name: string): Agent => ({
  createdAt: new Date(),
  id,
  isCeo: name === 'CEO',
  key: name.toLowerCase().replace(/\s+/g, '-'),
  modelCliId: null,
  model: null,
  name,
  soul: 'x'.repeat(50),
  status: 'not_ready',
  updatedAt: new Date(),
});

describe('bootstrapDefaultAgents', () => {
  it('skips seeding when the agents table is not empty', async () => {
    const repository = createRepository();
    vi.mocked(repository.count).mockResolvedValue(3);

    const result = await bootstrapDefaultAgents(repository);

    expect(result).toEqual([]);
    expect(repository.create).not.toHaveBeenCalled();
  });

  it('creates all default agents when the table is empty', async () => {
    const repository = createRepository();
    vi.mocked(repository.count).mockResolvedValue(0);

    let nextId = 1;
    vi.mocked(repository.create).mockImplementation(async (input) => {
      const id = nextId++;
      return fakeAgent(id, input.name);
    });

    const result = await bootstrapDefaultAgents(repository);

    expect(result).toHaveLength(defaultAgentNames.length);
    expect(repository.create).toHaveBeenCalledTimes(defaultAgentNames.length);
  });

  it('creates the CEO first with no parent', async () => {
    const repository = createRepository();
    vi.mocked(repository.count).mockResolvedValue(0);

    let nextId = 1;
    vi.mocked(repository.create).mockImplementation(async (input) => {
      const id = nextId++;
      return fakeAgent(id, input.name);
    });

    await bootstrapDefaultAgents(repository);

    const firstCall = vi.mocked(repository.create).mock.calls[0]![0];
    expect(firstCall.name).toBe('CEO');
    expect(firstCall.key).toBe('ceo');
    expect(firstCall.isCeo).toBe(true);
  });

  it('creates all non-ceo agents without extra hierarchy fields', async () => {
    const repository = createRepository();
    vi.mocked(repository.count).mockResolvedValue(0);

    let nextId = 1;
    vi.mocked(repository.create).mockImplementation(async (input) => {
      const id = nextId++;
      return fakeAgent(id, input.name);
    });

    await bootstrapDefaultAgents(repository);

    const calls = vi.mocked(repository.create).mock.calls;
    for (let i = 1; i < calls.length; i++) {
      expect(Object.keys(calls[i]![0])).not.toContain('reportsToAgentId');
    }
  });
});
