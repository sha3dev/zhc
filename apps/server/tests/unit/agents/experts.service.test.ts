import { describe, expect, it, vi } from 'vitest';
import type { AgentsRepository } from '../../../src/modules/agents/application/contracts.js';
import { ExpertsService } from '../../../src/modules/agents/application/experts-service.js';
import type { Agent } from '../../../src/modules/agents/domain/agent.js';
import { ValidationError } from '../../../src/shared/errors/app-error.js';

const createRepository = (): AgentsRepository => ({
  archive: vi.fn(),
  count: vi.fn(),
  create: vi.fn(),
  findAll: vi.fn(),
  findCeo: vi.fn(),
  findById: vi.fn(),
  findByIdWithRelations: vi.fn(),
  findForMemory: vi.fn(),
  getHierarchy: vi.fn(),
  getStats: vi.fn(),
  update: vi.fn(),
});

const createAgent = (overrides: Partial<Agent> = {}): Agent => ({
  createdAt: new Date(),
  id: 1,
  isCeo: true,
  kind: 'ceo',
  key: 'ceo',
  modelCliId: 'codex',
  model: 'gpt-5.4',
  name: 'CEO',
  subagentMd: '# Role\nCEO',
  status: 'ready',
  updatedAt: new Date(),
  ...overrides,
});

describe('ExpertsService', () => {
  it('lists only experts', async () => {
    const repository = createRepository();
    vi.mocked(repository.findAll).mockResolvedValue({ agents: [], total: 0 });
    const service = new ExpertsService(repository, { execute: vi.fn() } as never);

    await service.list({ limit: 20, offset: 0 });

    expect(repository.findAll).toHaveBeenCalledWith({
      kinds: ['expert'],
      limit: 20,
      offset: 0,
    });
  });

  it('creates drafts through the CEO runtime', async () => {
    const repository = createRepository();
    vi.mocked(repository.findCeo).mockResolvedValue(createAgent());
    const execute = vi.fn(async () => ({
      parsedOutput: {
        name: 'CrossFit Expert',
        subagentMd:
          '# Role\nCrossFit Expert\n\n## Identity\nExpert coach with 20 years of experience.\n\n## Expertise\n- Programming\n- Competition\n- Recovery',
      },
      validationError: null,
    }));
    const service = new ExpertsService(repository, { execute } as never);

    const draft = await service.createDraft({
      brief: 'coach con 20 años de experiencia en crossfit',
    });

    expect(execute).toHaveBeenCalledWith(
      expect.objectContaining({
        agentId: 1,
        operationKey: 'create-expert-draft',
      }),
    );
    expect(draft.name).toBe('CrossFit Expert');
  });

  it('fails when the CEO is not ready', async () => {
    const repository = createRepository();
    vi.mocked(repository.findCeo).mockResolvedValue(createAgent({ status: 'not_ready' }));
    const service = new ExpertsService(repository, { execute: vi.fn() } as never);

    await expect(service.createDraft({ brief: 'quant trader' })).rejects.toBeInstanceOf(
      ValidationError,
    );
  });
});
