import { describe, expect, it, vi } from 'vitest';
import type { ExpertsRepository } from '../../../src/modules/agents/application/experts-contracts.js';
import { ExpertsService } from '../../../src/modules/agents/application/experts-service.js';
import type { Agent } from '../../../src/modules/agents/domain/agent.js';
import type { Expert } from '../../../src/modules/agents/domain/expert.js';
import { ValidationError } from '../../../src/shared/errors/app-error.js';

const createRepository = (): ExpertsRepository => ({
  archive: vi.fn(),
  create: vi.fn(),
  findAll: vi.fn(),
  findById: vi.fn(),
  findByIdWithRelations: vi.fn(),
  findForMemory: vi.fn(),
  findRuntimeActorById: vi.fn(),
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

const createExpert = (overrides: Partial<Expert> = {}): Expert => ({
  createdAt: new Date(),
  id: 9,
  key: 'crossfit-expert',
  name: 'CrossFit Expert',
  subagentMd: '# Role\nCrossFit Expert',
  updatedAt: new Date(),
  ...overrides,
});

describe('ExpertsService', () => {
  it('lists only experts', async () => {
    const repository = createRepository();
    vi.mocked(repository.findAll).mockResolvedValue({ experts: [], total: 0 });
    const service = new ExpertsService(
      repository,
      { findCeo: vi.fn() } as never,
      {
        execute: vi.fn(),
      } as never,
    );

    await service.list({ limit: 20, offset: 0 });

    expect(repository.findAll).toHaveBeenCalledWith({ limit: 20, offset: 0 });
  });

  it('creates drafts through the CEO runtime', async () => {
    const repository = createRepository();
    const ceoLookup = { findCeo: vi.fn().mockResolvedValue(createAgent()) };
    const execute = vi.fn(async () => ({
      parsedOutput: {
        name: 'CrossFit Expert',
        subagentMd:
          '# Role\nCrossFit Expert\n\n## Identity\nExpert coach with 20 years of experience.\n\n## Expertise\n- Programming\n- Competition\n- Recovery',
      },
      validationError: null,
    }));
    const service = new ExpertsService(repository, ceoLookup, { execute } as never);

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
    const service = new ExpertsService(
      repository,
      { findCeo: vi.fn().mockResolvedValue(createAgent({ status: 'not_ready' })) } as never,
      { execute: vi.fn() } as never,
    );

    await expect(service.createDraft({ brief: 'quant trader' })).rejects.toBeInstanceOf(
      ValidationError,
    );
  });

  it('fails to create experts when the CEO is not ready', async () => {
    const repository = createRepository();
    const service = new ExpertsService(
      repository,
      { findCeo: vi.fn().mockResolvedValue(createAgent({ status: 'not_ready' })) } as never,
      { execute: vi.fn() } as never,
    );

    await expect(
      service.create({
        name: 'Quant Trading Expert',
        subagentMd:
          '# Role\nQuant Trading Expert\n\n## Identity\nExpert in market microstructure and execution systems.',
      }),
    ).rejects.toBeInstanceOf(ValidationError);
  });

  it('creates experts in the expert repository', async () => {
    const repository = createRepository();
    vi.mocked(repository.create).mockResolvedValue(createExpert());
    const service = new ExpertsService(
      repository,
      { findCeo: vi.fn().mockResolvedValue(createAgent()) } as never,
      { execute: vi.fn() } as never,
    );

    const result = await service.create({
      name: 'CrossFit Expert',
      subagentMd:
        '# Role\nCrossFit Expert\n\n## Identity\nExpert coach with 20 years of experience.',
    });

    expect(result.id).toBe(9);
    expect(repository.create).toHaveBeenCalled();
  });
});
