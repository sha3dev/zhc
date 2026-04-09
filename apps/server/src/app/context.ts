import {
  AgentsService,
  ExpertsService,
  SqlAgentsRepository,
  bootstrapDefaultAgents,
} from '../modules/agents/index.js';
import {
  ConfigurationService,
  SqlConfigurationRepository,
} from '../modules/configuration/index.js';
import {
  ClaudeCodeRunner,
  CodexRunner,
  ExecutionsService,
  FileSystemPromptRegistry,
  GeminiCliRunner,
  KiloRunner,
  OpenCodeRunner,
  SqlExecutionsRepository,
  SystemMemoryProvider,
} from '../modules/executions/index.js';
import {
  EmailPoller,
  EmailsService,
  ResendEmailProvider,
  SqlEmailsRepository,
} from '../modules/mails/index.js';
import { ModelsService } from '../modules/models/index.js';
import { ProjectsService, SqlProjectsRepository } from '../modules/projects/index.js';
import { SqlTasksRepository, TasksService } from '../modules/tasks/index.js';
import { ToolsService } from '../modules/tools/index.js';

export interface AppContext {
  agents: AgentsService;
  bootstrap: () => Promise<void>;
  configuration: ConfigurationService;
  emailPoller: EmailPoller;
  emails: EmailsService;
  experts: ExpertsService;
  executions: ExecutionsService;
  models: ModelsService;
  projects: ProjectsService;
  tasks: TasksService;
  tools: ToolsService;
}

export function createAppContext(): AppContext {
  const agentsRepository = new SqlAgentsRepository();
  const configurationRepository = new SqlConfigurationRepository();
  const emailsRepository = new SqlEmailsRepository();
  const executionsRepository = new SqlExecutionsRepository();
  const tasksRepository = new SqlTasksRepository();
  const projectsRepository = new SqlProjectsRepository();

  const tasks = new TasksService(tasksRepository);
  const projects = new ProjectsService(projectsRepository, tasksRepository);
  const agents = new AgentsService(agentsRepository);
  const configuration = new ConfigurationService(configurationRepository);
  const tools = new ToolsService();
  const models = new ModelsService(tools);
  const prompts = new FileSystemPromptRegistry();
  const memory = new SystemMemoryProvider(agents);
  const emails = new EmailsService(emailsRepository, new ResendEmailProvider(), configuration, {
    async getCeo() {
      const result = await agents.list({ limit: 100, offset: 0 });
      const ceo = result.agents.find((agent) => agent.isCeo);
      return ceo ? { id: ceo.id } : null;
    },
  });
  const emailPoller = new EmailPoller(emails, configuration);
  const executions = new ExecutionsService(agents, tools, prompts, memory, executionsRepository, [
    new ClaudeCodeRunner(),
    new CodexRunner(),
    new OpenCodeRunner(),
    new GeminiCliRunner(),
    new KiloRunner(),
  ]);

  const bootstrap = async (): Promise<void> => {
    await bootstrapDefaultAgents(agentsRepository);
  };
  const experts = new ExpertsService(agentsRepository, executions);

  return {
    agents,
    bootstrap,
    configuration,
    emailPoller,
    emails,
    experts,
    executions,
    models,
    projects,
    tasks,
    tools,
  };
}
