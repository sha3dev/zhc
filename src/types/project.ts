/**
 * Project types following database naming conventions
 *
 * This file defines all types related to the Project entity, including:
 * - Database entity types (stored in PostgreSQL)
 * - Domain types (used in application logic)
 * - DTO types (for API requests/responses)
 */

/**
 * Project status in the system
 */
export type ProjectStatus =
  | 'draft' // Initial state when human creates the project
  | 'planning' // CEO is analyzing and creating execution plan
  | 'ready' // Execution plan is ready, tasks can start
  | 'in_progress' // Tasks are being executed
  | 'completed' // All tasks completed
  | 'on_hold' // Project paused
  | 'cancelled'; // Project cancelled

/**
 * Task status in the system
 */
export type TaskStatus =
  | 'pending' // Task waiting to start
  | 'assigned' // Task assigned to an agent
  | 'in_progress' // Agent is working on the task
  | 'completed' // Task completed successfully
  | 'failed' // Task failed
  | 'blocked' // Task blocked by dependencies
  | 'cancelled'; // Task cancelled

/**
 * Database entity: project
 *
 * This represents the project as stored in PostgreSQL.
 * Column names follow the database naming conventions (PRJ_ prefix).
 */
export interface ProjectEntity {
  /** Primary key: PRJ_id */
  PRJ_id: number;
  /** Project name: PRJ_name */
  PRJ_name: string;
  /** URL-friendly identifier: PRJ_slug */
  PRJ_slug: string;
  /** Brief project description: PRJ_description */
  PRJ_description: string;
  /** Project status: PRJ_status */
  PRJ_status: ProjectStatus;
  /** Human creator identifier (external system): PRJ_created_by */
  PRJ_created_by: string;
  /** CEO agent ID assigned to this project: AGN_id */
  AGN_id: number | null;
  /** Creation timestamp: PRJ_created_at */
  PRJ_created_at: Date;
  /** Last update timestamp: PRJ_updated_at */
  PRJ_updated_at: Date;
}

/**
 * Database entity: task
 *
 * This represents a task as stored in PostgreSQL.
 * Column names follow the database naming conventions (TSK_ prefix).
 */
export interface TaskEntity {
  /** Primary key: TSK_id */
  TSK_id: number;
  /** Project ID this task belongs to: PRJ_id */
  PRJ_id: number;
  /** Agent ID assigned to this task: AGN_id */
  AGN_id: number | null;
  /** Task title (short description): TSK_title */
  TSK_title: string;
  /** Detailed task description (context for agent): TSK_description */
  TSK_description: string;
  /** Task status: TSK_status */
  TSK_status: TaskStatus;
  /** Order of execution: TSK_sort */
  TSK_sort: number;
  /** Creation timestamp: TSK_created_at */
  TSK_created_at: Date;
  /** Last update timestamp: TSK_updated_at */
  TSK_updated_at: Date;
}

/**
 * Database entity: task_dependency
 *
 * Represents dependencies between tasks.
 * A task depends on another task must complete first.
 */
export interface TaskDependencyEntity {
  /** Primary key: TDP_id */
  TDP_id: number;
  /** The task that has the dependency: TSK_id */
  TSK_id: number;
  /** The task that must complete first: TSK_id (depends on) */
  depends_on_TSK_id: number;
  /** Creation timestamp: TDP_created_at */
  TDP_created_at: Date;
}

/**
 * Domain model: Project
 *
 * This is the project type used throughout the application.
 * It has resolved references and includes related entities.
 */
export interface Project {
  /** Unique identifier */
  id: number;
  /** Project name */
  name: string;
  /** URL-friendly identifier */
  slug: string;
  /** Brief project description */
  description: string;
  /** Current status */
  status: ProjectStatus;
  /** Human creator identifier */
  createdBy: string;
  /** CEO agent assigned to this project */
  ceo?: {
    id: number;
    name: string;
  };
  /** All tasks in the project */
  tasks: Task[];
  /** When this project was created */
  createdAt: Date;
  /** Last update timestamp */
  updatedAt: Date;
}

/**
 * Domain model: Task
 *
 * This is the task type used throughout the application.
 */
export interface Task {
  /** Unique identifier */
  id: number;
  /** Project this task belongs to */
  projectId: number;
  /** Agent assigned to this task */
  assignedTo?: {
    id: number;
    name: string;
    role: string;
  };
  /** Short task title */
  title: string;
  /** Detailed description (context for agent execution) */
  description: string;
  /** Current status */
  status: TaskStatus;
  /** Order of execution */
  sort: number;
  /** Tasks that must complete before this one */
  dependsOn: Task[];
  /** Tasks that depend on this one */
  dependents: Task[];
  /** When this task was created */
  createdAt: Date;
  /** Last update timestamp */
  updatedAt: Date;
}

/**
 * DTO: Create Project Request
 *
 * Data transfer object for creating a new project.
 * This is what the human submits.
 */
export interface CreateProjectDTO {
  /** Project name */
  name: string;
  /** URL-friendly identifier (optional, auto-generated from name if not provided) */
  slug?: string;
  /** Brief project description */
  description: string;
  /** Human creator identifier */
  createdBy: string;
}

/**
 * DTO: Update Project Request
 *
 * Data transfer object for updating an existing project.
 */
export interface UpdateProjectDTO {
  /** Project name */
  name?: string;
  /** URL-friendly identifier */
  slug?: string;
  /** Project description */
  description?: string;
  /** Project status */
  status?: ProjectStatus;
}

/**
 * DTO: Project Response
 *
 * Data transfer object for API responses.
 */
export interface ProjectResponseDTO {
  /** Project ID */
  id: number;
  /** Project name */
  name: string;
  /** URL-friendly identifier */
  slug: string;
  /** Project description */
  description: string;
  /** Project status */
  status: ProjectStatus;
  /** Creator identifier */
  createdBy: string;
  /** CEO agent info */
  ceo?: {
    id: number;
    name: string;
  };
  /** Number of tasks */
  taskCount: number;
  /** Tasks summary by status */
  taskSummary: Record<TaskStatus, number>;
  /** Creation timestamp */
  createdAt: Date;
  /** Last update timestamp */
  updatedAt: Date;
}

/**
 * DTO: Create Task Request (Internal - CEO creates this)
 *
 * Data transfer object for creating tasks within a project.
 * This is what the CEO agent generates when creating the execution plan.
 */
export interface CreateTaskDTO {
  /** Project ID */
  projectId: number;
  /** Agent ID to assign this task to */
  assignedToAgentId: number;
  /** Task title (short, concise) */
  title: string;
  /**
   * Detailed task description
   * IMPORTANT: Must be clear and concise enough for the assigned agent
   * to execute without knowing anything else about the project.
   * Should include all necessary context.
   */
  description: string;
  /** Task IDs that must complete before this one (dependencies) */
  dependsOnTaskIds: number[];
  /** Order of execution */
  sort: number;
}

/**
 * DTO: Task Response
 *
 * Data transfer object for task API responses.
 */
export interface TaskResponseDTO {
  /** Task ID */
  id: number;
  /** Project ID */
  projectId: number;
  /** Assigned agent info */
  assignedTo?: {
    id: number;
    name: string;
  };
  /** Task title */
  title: string;
  /** Task description */
  description: string;
  /** Task status */
  status: TaskStatus;
  /** Execution order */
  sort: number;
  /** Task IDs this depends on */
  dependsOnTaskIds: number[];
  /** Creation timestamp */
  createdAt: Date;
  /** Last update timestamp */
  updatedAt: Date;
}

/**
 * Project query parameters
 *
 * Filters for querying projects.
 */
export interface ProjectQueryParams {
  /** Filter by slug */
  slug?: string;
  /** Filter by status */
  status?: ProjectStatus;
  /** Filter by creator */
  createdBy?: string;
  /** Search in name or description */
  search?: string;
  /** Pagination offset */
  offset?: number;
  /** Pagination limit */
  limit?: number;
}

/**
 * Task query parameters
 *
 * Filters for querying tasks.
 */
export interface TaskQueryParams {
  /** Filter by project */
  projectId?: number;
  /** Filter by status */
  status?: TaskStatus;
  /** Filter by assigned agent */
  assignedToAgentId?: number;
  /** Pagination offset */
  offset?: number;
  /** Pagination limit */
  limit?: number;
}

/**
 * Project statistics
 *
 * Summary statistics about a project.
 */
export interface ProjectStats {
  /** Total number of projects */
  totalProjects: number;
  /** Number of projects by status */
  projectsByStatus: Record<ProjectStatus, number>;
  /** Total number of tasks across all projects */
  totalTasks: number;
  /** Number of tasks by status */
  tasksByStatus: Record<TaskStatus, number>;
}

/**
 * Execution Plan (generated by CEO)
 *
 * Represents the complete execution plan that the CEO generates
 * after analyzing the human's project request.
 */
export interface ExecutionPlan {
  /** Project ID */
  projectId: number;
  /** List of tasks in execution order */
  tasks: CreateTaskDTO[];
  /**
   * CEO's analysis and rationale
   * This includes context about why the tasks are structured this way
   */
  rationale: string;
}
