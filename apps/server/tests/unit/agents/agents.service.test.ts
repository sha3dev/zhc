import { describe, expect, it, vi } from 'vitest';
import type { AgentsRepository } from '../../../src/modules/agents/application/contracts.js';
import { AgentsService } from '../../../src/modules/agents/application/service.js';
import { NotFoundError } from '../../../src/shared/errors/app-error.js';

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

describe('AgentsService', () => {
  it('throws a typed error when an agent does not exist', async () => {
    const repository = createRepository();
    vi.mocked(repository.findByIdWithRelations).mockResolvedValue(null);
    const service = new AgentsService(repository);

    await expect(service.getById(42)).rejects.toBeInstanceOf(NotFoundError);
  });

  it('returns paginated agents through the repository contract', async () => {
    const repository = createRepository();
    vi.mocked(repository.findAll).mockResolvedValue({
      agents: [],
      total: 0,
    });
    const service = new AgentsService(repository);

    const result = await service.list({ limit: 20, offset: 0 });

    expect(repository.findAll).toHaveBeenCalledWith({
      limit: 20,
      offset: 0,
    });
    expect(result.total).toBe(0);
  });
});
