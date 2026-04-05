/**
 * Project Service
 *
 * Orchestrates project workflows including creation by humans,
 * CEO execution plan generation, and task management.
 */

import { projectRepository } from '../repositories/project.repository.js';
import { taskRepository } from '../repositories/task.repository.js';
import type {
  CreateProjectDTO,
  ExecutionPlan,
  Project,
  ProjectResponseDTO,
  Task,
  UpdateProjectDTO,
} from '../types/project.js';

/**
 * Project Service
 */
export class ProjectService {
  /**
   * Create a new project (initiated by human)
   *
   * This is called when a human creates a project.
   * The project starts in 'draft' status.
   */
  async createProject(dto: CreateProjectDTO): Promise<Project> {
    const project = await projectRepository.create(dto);
    return project;
  }

  /**
   * Get project by ID
   */
  async getProject(id: number): Promise<Project | null> {
    return projectRepository.findByIdWithRelations(id);
  }

  /**
   * Get project by slug
   */
  async getProjectBySlug(slug: string): Promise<Project | null> {
    return projectRepository.findBySlug(slug);
  }

  /**
   * List projects with filtering
   */
  async listProjects(params: {
    status?: Project['status'];
    createdBy?: string;
    search?: string;
    offset?: number;
    limit?: number;
  }): Promise<{ projects: Project[]; total: number }> {
    return projectRepository.findAll(params);
  }

  /**
   * Update project
   */
  async updateProject(id: number, dto: UpdateProjectDTO): Promise<Project | null> {
    return projectRepository.update(id, dto);
  }

  /**
   * CEO Agent: Generate execution plan for a project
   *
   * This is called by the CEO agent to "land" the human's request.
   * The CEO analyzes the project and creates tasks with dependencies.
   *
   * IMPORTANT: Task descriptions must be clear enough for the assigned
   * agent to execute without knowing anything else about the project.
   *
   * Documentation is created as files in the git repository by the CEO.
   * Tasks reference these files by name in the documentationReference field.
   */
  async generateExecutionPlan(projectId: number, plan: ExecutionPlan): Promise<Project> {
    // Verify project exists
    const project = await projectRepository.findById(projectId);
    if (!project) {
      throw new Error(`Project ${projectId} not found`);
    }

    // Update project status to 'planning'
    await projectRepository.updateStatus(projectId, 'planning');

    // Create tasks (documentation is created separately in the git repo)
    for (const task of plan.tasks) {
      await taskRepository.create(task);
    }

    // Update project status to 'ready' (execution plan is ready)
    await projectRepository.updateStatus(projectId, 'ready');

    // Return updated project with tasks
    const updatedProject = await projectRepository.findByIdWithRelations(projectId);
    if (!updatedProject) {
      throw new Error(`Failed to retrieve updated project ${projectId}`);
    }
    return updatedProject;
  }

  /**
   * Get next tasks that can be executed (all dependencies satisfied)
   */
  async getNextTasks(projectId: number): Promise<Task[]> {
    return taskRepository.getNextPendingTasks(projectId);
  }

  /**
   * Start a task (assign to agent and update status)
   */
  async startTask(taskId: number, agentId: number): Promise<Task | null> {
    const task = await taskRepository.findByIdWithRelations(taskId);
    if (!task) {
      throw new Error(`Task ${taskId} not found`);
    }

    // Check if task can start (all dependencies completed)
    const canStart = await taskRepository.canStart(taskId);
    if (!canStart) {
      throw new Error(`Task ${taskId} cannot start: dependencies not completed`);
    }

    // Assign agent and update status
    return taskRepository.assignAgent(taskId, agentId);
  }

  /**
   * Complete a task
   */
  async completeTask(taskId: number): Promise<Task | null> {
    const task = await taskRepository.updateStatus(taskId, 'completed');

    // Check if all tasks in project are completed
    if (task) {
      const projectTasks = await taskRepository.findByProjectId(task.projectId);
      const allCompleted = projectTasks.every((t) => t.status === 'completed');

      if (allCompleted) {
        await projectRepository.updateStatus(task.projectId, 'completed');
      }
    }

    return task;
  }

  /**
   * Fail a task
   */
  async failTask(taskId: number): Promise<Task | null> {
    return taskRepository.updateStatus(taskId, 'failed');
  }

  /**
   * Get project with all tasks and dependencies
   */
  async getProjectWithTasks(projectId: number): Promise<Project & { tasks: Task[] }> {
    const project = await projectRepository.findByIdWithRelations(projectId);
    if (!project) {
      throw new Error(`Project ${projectId} not found`);
    }

    const tasks = await taskRepository.findByProjectId(projectId);

    return {
      ...project,
      tasks,
    };
  }

  /**
   * Get task by ID with full relations
   */
  async getTask(taskId: number): Promise<Task | null> {
    return taskRepository.findByIdWithRelations(taskId);
  }

  /**
   * Get tasks for a project
   */
  async getProjectTasks(projectId: number): Promise<Task[]> {
    return taskRepository.findByProjectId(projectId);
  }

  /**
   * Update project status
   */
  async updateProjectStatus(projectId: number, status: Project['status']): Promise<void> {
    await projectRepository.updateStatus(projectId, status);
  }

  /**
   * Assign CEO to project
   */
  async assignCEO(projectId: number, agentId: number): Promise<Project> {
    const updated = await projectRepository.assignCEO(projectId, agentId);
    if (!updated) {
      throw new Error(`Failed to assign CEO to project ${projectId}`);
    }
    return updated;
  }

  /**
   * Delete a project
   */
  async deleteProject(projectId: number): Promise<boolean> {
    return projectRepository.delete(projectId);
  }

  /**
   * Convert project to response DTO
   */
  async toResponseDTO(project: Project): Promise<ProjectResponseDTO> {
    const tasks = await taskRepository.findByProjectId(project.id);

    const taskSummary = tasks.reduce(
      (acc, task) => {
        acc[task.status] = (acc[task.status] ?? 0) + 1;
        return acc;
      },
      {} as Record<string, number>,
    );

    return {
      id: project.id,
      name: project.name,
      slug: project.slug,
      description: project.description,
      status: project.status,
      createdBy: project.createdBy,
      ceo: project.ceo,
      taskCount: tasks.length,
      taskSummary: taskSummary as ProjectResponseDTO['taskSummary'],
      createdAt: project.createdAt,
      updatedAt: project.updatedAt,
    };
  }
}

// Export singleton instance
export const projectService = new ProjectService();
