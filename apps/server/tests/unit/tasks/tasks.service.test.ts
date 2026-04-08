import { describe, expect, it, vi } from 'vitest';
import type { TasksRepository } from '../../../src/modules/tasks/application/contracts.js';
import { TasksService } from '../../../src/modules/tasks/application/service.js';
import { NotFoundError, ValidationError } from '../../../src/shared/errors/app-error.js';

const repository = (): TasksRepository => ({
  assign: vi.fn(),
  canStart: vi.fn(),
  create: vi.fn(),
  findAll: vi.fn(),
  findById: vi.fn(),
  findByProjectId: vi.fn(),
  getNextPendingTasks: vi.fn(),
  updateStatus: vi.fn(),
});

describe('TasksService', () => {
  it('blocks task start when dependencies are unresolved', async () => {
    const tasksRepository = repository();
    vi.mocked(tasksRepository.canStart).mockResolvedValue(false);
    const service = new TasksService(tasksRepository);

    await expect(service.start(10, 2)).rejects.toBeInstanceOf(ValidationError);
  });

  it('raises NotFoundError when updating an unknown task', async () => {
    const tasksRepository = repository();
    vi.mocked(tasksRepository.updateStatus).mockResolvedValue(null);
    const service = new TasksService(tasksRepository);

    await expect(service.updateStatus(999, 'completed')).rejects.toBeInstanceOf(NotFoundError);
  });
});
