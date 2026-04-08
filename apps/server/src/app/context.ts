import {
  AgentsService,
  SqlAgentsRepository,
  bootstrapDefaultAgents,
} from '../modules/agents/index.js';
import {
  ClaudeCodeRunner,
  CodexRunner,
  ExecutionsService,
  FileSystemPromptRegistry,
  GeminiCliRunner,
  OpenCodeRunner,
  SystemMemoryProvider,
} from '../modules/executions/index.js';
import { ModelsService } from '../modules/models/index.js';
import { ProjectsService, SqlProjectsRepository } from '../modules/projects/index.js';
import { SqlTasksRepository, TasksService } from '../modules/tasks/index.js';
import { ToolsService } from '../modules/tools/index.js';

export interface AppContext {
  agents: AgentsService;
  bootstrap: () => Promise<void>;
  executions: ExecutionsService;
  models: ModelsService;
  projects: ProjectsService;
  tasks: TasksService;
  tools: ToolsService;
}

export function createAppContext(): AppContext {
  const agentsRepository = new SqlAgentsRepository();
  const tasksRepository = new SqlTasksRepository();
  const projectsRepository = new SqlProjectsRepository();

  const tasks = new TasksService(tasksRepository);
  const projects = new ProjectsService(projectsRepository, tasksRepository);
  const agents = new AgentsService(agentsRepository);
  const tools = new ToolsService();
  const models = new ModelsService(tools);
  const prompts = new FileSystemPromptRegistry();
  const memory = new SystemMemoryProvider(agents);
  const executions = new ExecutionsService(agents, tools, prompts, memory, [
    new ClaudeCodeRunner(),
    new CodexRunner(),
    new OpenCodeRunner(),
    new GeminiCliRunner(),
  ]);

  const bootstrap = async (): Promise<void> => {
    await bootstrapDefaultAgents(agentsRepository);
  };

  return {
    agents,
    bootstrap,
    executions,
    models,
    projects,
    tasks,
    tools,
  };
}
