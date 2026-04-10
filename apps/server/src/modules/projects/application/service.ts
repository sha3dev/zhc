import { mkdir, readdir, rename, rm, stat, writeFile } from 'node:fs/promises';
import { dirname, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { NotFoundError, ValidationError } from '../../../shared/errors/app-error.js';
import type { RegistryEntityMemorySummary } from '../../agents/domain/expert.js';
import type { Task } from '../../tasks/domain/task.js';
import type { Project, ProjectArtifact, ProjectDetails } from '../domain/project.js';
import type {
  CreateProjectInput,
  ListProjectsQuery,
  ProjectCreationResult,
  ProjectPlanner,
  ProjectPlanningAgentLookup,
  ProjectTasksGateway,
  ProjectsRepository,
  UpdateProjectInput,
} from './contracts.js';
import type { CreateProjectOperationOutput } from './operations.js';

const EXPERT_ADVISORY_KEYWORDS = [
  'advis',
  'analysis',
  'assess',
  'consult',
  'discovery',
  'evaluate',
  'feedback',
  'investigate',
  'research',
  'review',
  'validate',
] as const;

const PROJECT_SERVICE_DIR = dirname(fileURLToPath(import.meta.url));
const DEFAULT_PROJECTS_ROOT = resolve(PROJECT_SERVICE_DIR, '../../../../../../projects');
const DEFAULT_ARTIFACT_TITLE_BY_PATH = new Map<string, string>([['README.md', 'README']]);

function normalizeSlug(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 48);
}

function createDraftName(brief: string): string {
  const normalized = brief.replace(/\s+/g, ' ').trim();
  if (!normalized) {
    return 'Project draft';
  }

  return normalized.slice(0, 80);
}

function createDraftSlug(brief: string): string {
  const base = normalizeSlug(brief);
  return base
    ? `${base.slice(0, 40)}-${Date.now().toString(36)}`
    : `project-${Date.now().toString(36)}`;
}

function createTaskMarkdown(task: CreateProjectOperationOutput['tasks'][number]): string {
  const sections = [
    task.description.trim(),
    `## Deliverable\n${task.deliverable.trim()}`,
    `## Acceptance Criteria\n${task.acceptanceCriteria.map((item) => `- ${item}`).join('\n')}`,
  ];

  if (task.implementationNotes.length > 0) {
    sections.push(
      `## Implementation Notes\n${task.implementationNotes.map((item) => `- ${item}`).join('\n')}`,
    );
  }

  if (task.dependsOnTaskKeys.length > 0) {
    sections.push(`## Dependencies\n${task.dependsOnTaskKeys.map((key) => `- ${key}`).join('\n')}`);
  }

  return sections.join('\n\n');
}

function hasDuplicateTaskKeys(plan: CreateProjectOperationOutput): string | null {
  const keys = new Set<string>();

  for (const task of plan.tasks) {
    if (keys.has(task.key)) {
      return task.key;
    }
    keys.add(task.key);
  }

  return null;
}

function isAdvisoryTask(task: {
  description: string;
  title: string;
  implementationNotes: string[];
}): boolean {
  const haystack =
    `${task.title} ${task.description} ${task.implementationNotes.join(' ')}`.toLowerCase();
  return EXPERT_ADVISORY_KEYWORDS.some((keyword) => haystack.includes(keyword));
}

function sortTasksForCreation(plan: CreateProjectOperationOutput) {
  const byKey = new Map(plan.tasks.map((task) => [task.key, task]));
  const inDegree = new Map<string, number>();
  const dependents = new Map<string, string[]>();

  for (const task of plan.tasks) {
    inDegree.set(task.key, task.dependsOnTaskKeys.length);

    for (const dependencyKey of task.dependsOnTaskKeys) {
      const current = dependents.get(dependencyKey) ?? [];
      current.push(task.key);
      dependents.set(dependencyKey, current);
    }
  }

  const ready = plan.tasks
    .filter((task) => (inDegree.get(task.key) ?? 0) === 0)
    .sort((a, b) => a.sort - b.sort || a.key.localeCompare(b.key));
  const ordered: CreateProjectOperationOutput['tasks'] = [];

  while (ready.length > 0) {
    const current = ready.shift()!;
    ordered.push(current);

    for (const dependentKey of dependents.get(current.key) ?? []) {
      const nextDegree = (inDegree.get(dependentKey) ?? 0) - 1;
      inDegree.set(dependentKey, nextDegree);

      if (nextDegree === 0) {
        ready.push(byKey.get(dependentKey)!);
        ready.sort((a, b) => a.sort - b.sort || a.key.localeCompare(b.key));
      }
    }
  }

  if (ordered.length !== plan.tasks.length) {
    throw new ValidationError('Project plan contains circular task dependencies');
  }

  return ordered;
}

function buildActivePath(tasks: Task[]): { activePathIds: number[]; activeTaskId: number | null } {
  const activeStatuses: Task['status'][] = [
    'reopened',
    'changes_requested',
    'awaiting_review',
    'in_progress',
    'assigned',
  ];
  const taskById = new Map(tasks.map((task) => [task.id, task]));
  const activeTask =
    tasks
      .filter((task) => activeStatuses.includes(task.status))
      .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime() || b.id - a.id)[0] ?? null;

  if (!activeTask) {
    return { activePathIds: [], activeTaskId: null };
  }

  const path = new Set<number>();
  const walk = (taskId: number) => {
    if (path.has(taskId)) {
      return;
    }

    path.add(taskId);
    const task = taskById.get(taskId);
    if (!task) {
      return;
    }

    for (const dependencyId of task.dependsOnTaskIds) {
      walk(dependencyId);
    }
  };

  walk(activeTask.id);

  return {
    activePathIds: Array.from(path),
    activeTaskId: activeTask.id,
  };
}

function decorateProjectTasks(tasks: Task[]): Task[] {
  const completedById = new Map(tasks.map((task) => [task.id, task.status === 'completed']));
  const runnableStatuses = new Set<Task['status']>([
    'pending',
    'assigned',
    'in_progress',
    'changes_requested',
    'reopened',
    'failed',
  ]);

  return tasks.map((task) => {
    const dependenciesCompleted = task.dependsOnTaskIds.every(
      (dependencyId) => completedById.get(dependencyId) === true,
    );

    if (!task.assignedToAgentId) {
      return {
        ...task,
        canRun: false,
        runBlockedReason: 'Task must be assigned before it can run.',
      };
    }

    if (!dependenciesCompleted) {
      return {
        ...task,
        canRun: false,
        runBlockedReason: 'Task is blocked until all dependencies are completed.',
      };
    }

    if (!runnableStatuses.has(task.status)) {
      return {
        ...task,
        canRun: false,
        runBlockedReason: `Task cannot run while status is ${task.status}.`,
      };
    }

    return {
      ...task,
      canRun: true,
      runBlockedReason: null,
    };
  });
}

async function pathExists(path: string): Promise<boolean> {
  try {
    await stat(path);
    return true;
  } catch {
    return false;
  }
}

export class ProjectsService {
  constructor(
    private readonly repository: ProjectsRepository,
    private readonly tasksGateway: ProjectTasksGateway,
    private readonly agents: ProjectPlanningAgentLookup,
    private readonly planner: ProjectPlanner,
    private readonly projectsRoot: string = DEFAULT_PROJECTS_ROOT,
  ) {}

  assignOwner(projectId: number, agentId: number): Promise<Project | null> {
    return this.repository.assignOwner(projectId, agentId);
  }

  async create(input: CreateProjectInput): Promise<ProjectCreationResult> {
    const ceo = await this.agents.findCeo();

    if (!ceo) {
      throw new ValidationError('Cannot create project because the CEO does not exist');
    }

    if (ceo.status !== 'ready') {
      throw new ValidationError('Cannot create project because the CEO is not ready');
    }

    const sourceBrief = input.brief.trim();
    const draftSlug = createDraftSlug(sourceBrief);
    const draftWorkingDirectory = await this.ensureProjectDirectory(draftSlug);

    const draft = await this.repository.create({
      createdBy: input.createdBy ?? 'system',
      definitionBrief: '',
      name: createDraftName(sourceBrief),
      ownerAgentId: ceo.id,
      planningExecutionId: null,
      slug: draftSlug,
      sourceBrief,
      status: 'draft',
    });

    await this.repository.updateStatus(draft.id, 'planning');

    const execution = await this.planner.execute({
      agentId: ceo.id,
      operationKey: 'create-project',
      userInput: sourceBrief,
      workingDirectory: draftWorkingDirectory,
    });

    const plan = execution.parsedOutput;

    if (!plan) {
      throw new ValidationError(
        execution.validationError ?? 'Project planner returned invalid output',
      );
    }

    this.validatePlan(plan);

    const finalSlug = normalizeSlug(plan.name) || draft.slug;
    const finalWorkingDirectory = await this.finalizeProjectDirectory(draft.slug, finalSlug);

    const availableAgents = await this.agents.listForMemory();
    const agentByKey = new Map(availableAgents.map((agent) => [agent.key, agent]));

    for (const task of plan.tasks) {
      if (!task.assignedToAgentKey) {
        continue;
      }

      const assignedAgent = agentByKey.get(task.assignedToAgentKey);
      if (!assignedAgent) {
        throw new ValidationError(`Unknown assignedToAgentKey: ${task.assignedToAgentKey}`);
      }

      if (assignedAgent.kind === 'expert' && !isAdvisoryTask(task)) {
        throw new ValidationError(
          `Expert assignments must be advisory: task ${task.key} is assigned to ${assignedAgent.key}`,
        );
      }
    }

    const persistedPlan = await this.repository.update(draft.id, {
      definitionBrief: plan.definitionBrief,
      name: plan.name,
      ownerAgentId: ceo.id,
      planningExecutionId: execution.id,
      slug: finalSlug,
    });

    if (!persistedPlan) {
      throw new NotFoundError(`Project ${draft.id} not found`);
    }

    await this.writeSupportArtifacts(finalWorkingDirectory, plan.supportArtifacts);

    const taskIdByKey = new Map<string, number>();
    const orderedTasks = sortTasksForCreation(plan);

    for (const task of orderedTasks) {
      const assignedAgentId = this.resolveAssignedAgentId(task, agentByKey);
      const dependsOnTaskIds = task.dependsOnTaskKeys.map((dependencyKey) => {
        const dependencyId = taskIdByKey.get(dependencyKey);

        if (!dependencyId) {
          throw new ValidationError(
            `Task ${task.key} depends on unresolved task key ${dependencyKey}`,
          );
        }

        return dependencyId;
      });

      const createdTask = await this.tasksGateway.create({
        assignedToAgentId: assignedAgentId,
        dependsOnTaskIds,
        description: createTaskMarkdown(task),
        projectId: draft.id,
        sort: task.sort,
        title: task.title,
      });

      taskIdByKey.set(task.key, createdTask.id);
    }

    await this.repository.updateStatus(draft.id, 'ready');

    return this.getById(draft.id);
  }

  delete(projectId: number): Promise<boolean> {
    return this.deleteProject(projectId);
  }

  async getById(projectId: number): Promise<ProjectDetails> {
    const project = await this.repository.findById(projectId);

    if (!project) {
      throw new NotFoundError(`Project ${projectId} not found`);
    }

    const tasks = decorateProjectTasks(await this.tasksGateway.findByProjectId(projectId));
    const workingDirectory = this.getProjectWorkingDirectory(project.slug);
    const artifacts = await this.listProjectArtifacts(workingDirectory);
    const { activePathIds, activeTaskId } = buildActivePath(tasks);

    return {
      activePathIds,
      activeTaskId,
      ...project,
      artifacts,
      tasks,
      workingDirectory,
    };
  }

  async getBySlug(slug: string): Promise<ProjectDetails> {
    const project = await this.repository.findBySlug(slug);

    if (!project) {
      throw new NotFoundError(`Project ${slug} not found`);
    }

    const tasks = decorateProjectTasks(await this.tasksGateway.findByProjectId(project.id));
    const workingDirectory = this.getProjectWorkingDirectory(project.slug);
    const artifacts = await this.listProjectArtifacts(workingDirectory);
    const { activePathIds, activeTaskId } = buildActivePath(tasks);

    return {
      activePathIds,
      activeTaskId,
      ...project,
      artifacts,
      tasks,
      workingDirectory,
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

  private async deleteProject(projectId: number): Promise<boolean> {
    const project = await this.repository.findById(projectId);

    if (!project) {
      throw new NotFoundError(`Project ${projectId} not found`);
    }

    const deleted = await this.repository.delete(projectId);

    if (!deleted) {
      throw new NotFoundError(`Project ${projectId} not found`);
    }

    await rm(this.getProjectWorkingDirectory(project.slug), { force: true, recursive: true });

    return true;
  }

  private getProjectWorkingDirectory(slug: string): string {
    return resolve(this.projectsRoot, slug);
  }

  private async ensureProjectDirectory(slug: string): Promise<string> {
    const projectDirectory = this.getProjectWorkingDirectory(slug);
    await mkdir(projectDirectory, { recursive: true });
    return projectDirectory;
  }

  private async finalizeProjectDirectory(initialSlug: string, finalSlug: string): Promise<string> {
    const initialDirectory = this.getProjectWorkingDirectory(initialSlug);
    const finalDirectory = this.getProjectWorkingDirectory(finalSlug);

    await mkdir(this.projectsRoot, { recursive: true });

    if (initialDirectory === finalDirectory) {
      await mkdir(finalDirectory, { recursive: true });
      return finalDirectory;
    }

    if (await pathExists(initialDirectory)) {
      if (!(await pathExists(finalDirectory))) {
        await rename(initialDirectory, finalDirectory);
      } else {
        await mkdir(finalDirectory, { recursive: true });
      }
    } else {
      await mkdir(finalDirectory, { recursive: true });
    }

    return finalDirectory;
  }

  private resolveAssignedAgentId(
    task: CreateProjectOperationOutput['tasks'][number],
    agentByKey: Map<string, RegistryEntityMemorySummary>,
  ): number | null {
    if (task.assignedToAgentId) {
      return task.assignedToAgentId;
    }

    if (task.assignedToAgentKey) {
      return agentByKey.get(task.assignedToAgentKey)?.id ?? null;
    }

    return null;
  }

  private validatePlan(plan: CreateProjectOperationOutput): void {
    const duplicateKey = hasDuplicateTaskKeys(plan);
    if (duplicateKey) {
      throw new ValidationError(`Duplicate task key in project plan: ${duplicateKey}`);
    }

    const taskKeys = new Set(plan.tasks.map((task) => task.key));

    for (const artifact of plan.supportArtifacts) {
      if (artifact.path.includes('..') || artifact.path.startsWith('/')) {
        throw new ValidationError(`Unsafe support artifact path: ${artifact.path}`);
      }
    }

    for (const task of plan.tasks) {
      for (const dependencyKey of task.dependsOnTaskKeys) {
        if (!taskKeys.has(dependencyKey)) {
          throw new ValidationError(
            `Task ${task.key} depends on unknown task key ${dependencyKey}`,
          );
        }
      }
    }
  }

  private async writeSupportArtifacts(
    workingDirectory: string,
    artifacts: CreateProjectOperationOutput['supportArtifacts'],
  ): Promise<void> {
    for (const artifact of artifacts) {
      const absolutePath = resolve(workingDirectory, artifact.path);

      if (!absolutePath.startsWith(workingDirectory)) {
        throw new ValidationError(`Unsafe support artifact path: ${artifact.path}`);
      }

      await mkdir(dirname(absolutePath), { recursive: true });
      await writeFile(absolutePath, artifact.content, 'utf-8');
    }
  }

  private async listProjectArtifacts(workingDirectory: string): Promise<ProjectArtifact[]> {
    if (!(await pathExists(workingDirectory))) {
      return [];
    }

    const entries = await this.readArtifactsRecursive(workingDirectory, workingDirectory);
    return entries.sort((a, b) => a.path.localeCompare(b.path));
  }

  private async readArtifactsRecursive(
    rootDirectory: string,
    currentDirectory: string,
  ): Promise<ProjectArtifact[]> {
    const entries = await readdir(currentDirectory, { withFileTypes: true });
    const artifacts: ProjectArtifact[] = [];

    for (const entry of entries) {
      if (entry.name === 'node_modules' || entry.name === 'dist' || entry.name.startsWith('.')) {
        continue;
      }

      const absolutePath = resolve(currentDirectory, entry.name);

      if (entry.isDirectory()) {
        artifacts.push(...(await this.readArtifactsRecursive(rootDirectory, absolutePath)));
        continue;
      }

      const relativePath = relative(rootDirectory, absolutePath).replaceAll('\\', '/');
      const title =
        DEFAULT_ARTIFACT_TITLE_BY_PATH.get(relativePath) ??
        relativePath
          .split('/')
          .pop()
          ?.replace(/\.[^.]+$/, '')
          .replace(/[-_]/g, ' ') ??
        relativePath;

      artifacts.push({
        path: relativePath,
        title,
      });
    }

    return artifacts;
  }
}
