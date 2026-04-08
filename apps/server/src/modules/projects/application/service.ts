import { NotFoundError } from '../../../shared/errors/app-error.js';
import type { Task } from '../../tasks/domain/task.js';
import type { Project, ProjectDetails } from '../domain/project.js';
import type {
  CreateExecutionPlanInput,
  CreateProjectInput,
  ListProjectsQuery,
  ProjectTasksGateway,
  ProjectsRepository,
  UpdateProjectInput,
} from './contracts.js';

export class ProjectsService {
  constructor(
    private readonly repository: ProjectsRepository,
    private readonly tasksGateway: ProjectTasksGateway,
  ) {}

  assignOwner(projectId: number, agentId: number): Promise<Project | null> {
    return this.repository.assignOwner(projectId, agentId);
  }

  create(input: CreateProjectInput): Promise<Project> {
    return this.repository.create(input);
  }

  delete(projectId: number): Promise<boolean> {
    return this.repository.delete(projectId);
  }

  async generateExecutionPlan(
    projectId: number,
    plan: CreateExecutionPlanInput,
  ): Promise<ProjectDetails> {
    const existing = await this.repository.findById(projectId);

    if (!existing) {
      throw new NotFoundError(`Project ${projectId} not found`);
    }

    await this.repository.updateStatus(projectId, 'planning');

    for (const task of plan.tasks) {
      await this.tasksGateway.create({ ...task, projectId });
    }

    await this.repository.updateStatus(projectId, 'ready');

    return this.getById(projectId);
  }

  async getById(projectId: number): Promise<ProjectDetails> {
    const project = await this.repository.findById(projectId);

    if (!project) {
      throw new NotFoundError(`Project ${projectId} not found`);
    }

    const tasks = await this.tasksGateway.findByProjectId(projectId);

    return {
      ...project,
      tasks,
    };
  }

  async getBySlug(slug: string): Promise<ProjectDetails> {
    const project = await this.repository.findBySlug(slug);

    if (!project) {
      throw new NotFoundError(`Project ${slug} not found`);
    }

    const tasks = await this.tasksGateway.findByProjectId(project.id);

    return {
      ...project,
      tasks,
    };
  }

  list(query: ListProjectsQuery): Promise<{ projects: Project[]; total: number }> {
    return this.repository.findAll(query);
  }

  nextTasks(projectId: number): Promise<Task[]> {
    return this.tasksGateway.getNextPendingTasks(projectId);
  }

  async update(projectId: number, input: UpdateProjectInput): Promise<Project> {
    const updated = await this.repository.update(projectId, input);

    if (!updated) {
      throw new NotFoundError(`Project ${projectId} not found`);
    }

    return updated;
  }

  async updateStatus(projectId: number, status: Project['status']): Promise<Project> {
    const updated = await this.repository.updateStatus(projectId, status);

    if (!updated) {
      throw new NotFoundError(`Project ${projectId} not found`);
    }

    return updated;
  }
}
