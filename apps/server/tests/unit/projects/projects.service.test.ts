import { describe, expect, it, vi } from 'vitest';
import type {
  ProjectTasksGateway,
  ProjectsRepository,
} from '../../../src/modules/projects/application/contracts.js';
import { ProjectsService } from '../../../src/modules/projects/application/service.js';
import { NotFoundError } from '../../../src/shared/errors/app-error.js';

const projectRepository = (): ProjectsRepository => ({
  assignOwner: vi.fn(),
  create: vi.fn(),
  delete: vi.fn(),
  findAll: vi.fn(),
  findById: vi.fn(),
  findBySlug: vi.fn(),
  update: vi.fn(),
  updateStatus: vi.fn(),
});

const tasksGateway = (): ProjectTasksGateway => ({
  create: vi.fn(),
  findByProjectId: vi.fn(),
  getNextPendingTasks: vi.fn(),
  updateStatus: vi.fn(),
});

describe('ProjectsService', () => {
  it('fails with NotFoundError when generating a plan for an unknown project', async () => {
    const projects = projectRepository();
    const tasks = tasksGateway();
    vi.mocked(projects.findById).mockResolvedValue(null);

    const service = new ProjectsService(projects, tasks);

    await expect(
      service.generateExecutionPlan(99, {
        rationale: 'test',
        tasks: [],
      }),
    ).rejects.toBeInstanceOf(NotFoundError);
  });

  it('loads project details with task aggregation', async () => {
    const projects = projectRepository();
    const tasks = tasksGateway();
    vi.mocked(projects.findById).mockResolvedValue({
      createdAt: new Date(),
      createdBy: 'jc',
      description: 'desc',
      id: 1,
      name: 'Project',
      ownerAgentId: null,
      slug: 'project',
      status: 'draft',
      updatedAt: new Date(),
    });
    vi.mocked(tasks.findByProjectId).mockResolvedValue([]);

    const service = new ProjectsService(projects, tasks);
    const result = await service.getById(1);

    expect(result.id).toBe(1);
    expect(result.tasks).toEqual([]);
  });
});
