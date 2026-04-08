import { NotFoundError, ValidationError } from '../../../shared/errors/app-error.js';
import type { Task } from '../domain/task.js';
import type { CreateTaskInput, ListTasksQuery, TasksRepository } from './contracts.js';

export class TasksService {
  constructor(private readonly repository: TasksRepository) {}

  assign(taskId: number, agentId: number): Promise<Task | null> {
    return this.repository.assign(taskId, agentId);
  }

  create(input: CreateTaskInput): Promise<Task> {
    return this.repository.create(input);
  }

  async getById(id: number): Promise<Task> {
    const task = await this.repository.findById(id);

    if (!task) {
      throw new NotFoundError(`Task ${id} not found`);
    }

    return task;
  }

  list(query: ListTasksQuery): Promise<{ tasks: Task[]; total: number }> {
    return this.repository.findAll(query);
  }

  listByProject(projectId: number): Promise<Task[]> {
    return this.repository.findByProjectId(projectId);
  }

  nextPending(projectId: number): Promise<Task[]> {
    return this.repository.getNextPendingTasks(projectId);
  }

  async start(taskId: number, agentId: number): Promise<Task> {
    const canStart = await this.repository.canStart(taskId);

    if (!canStart) {
      throw new ValidationError(`Task ${taskId} cannot start until dependencies are completed`);
    }

    const assigned = await this.repository.assign(taskId, agentId);

    if (!assigned) {
      throw new NotFoundError(`Task ${taskId} not found`);
    }

    return assigned;
  }

  async updateStatus(taskId: number, status: Task['status']): Promise<Task> {
    const updated = await this.repository.updateStatus(taskId, status);

    if (!updated) {
      throw new NotFoundError(`Task ${taskId} not found`);
    }

    return updated;
  }
}
