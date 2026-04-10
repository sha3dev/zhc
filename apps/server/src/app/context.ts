import {
  AgentsService,
  ExpertsService,
  SqlAgentsRepository,
  SqlExpertsRepository,
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
  FileSystemSkillRegistry,
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
import {
  SqlTaskEventsRepository,
  SqlTasksRepository,
  TasksService,
} from '../modules/tasks/index.js';
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
  const expertsRepository = new SqlExpertsRepository();
  const configurationRepository = new SqlConfigurationRepository();
  const emailsRepository = new SqlEmailsRepository();
  const executionsRepository = new SqlExecutionsRepository();
  const tasksRepository = new SqlTasksRepository();
  const taskEventsRepository = new SqlTaskEventsRepository();
  const projectsRepository = new SqlProjectsRepository();
  const agents = new AgentsService(agentsRepository);
  // biome-ignore lint/style/useConst: forward reference required — experts depends on executions, registryLookup depends on experts
  let experts!: ExpertsService;
  const registryLookup = {
    findCeo: () => agents.findCeo(),
    async getById(id: number) {
      const agent = await agents.getById(id).catch(() => null);
      if (agent) {
        return agent;
      }

      const expert = await experts.findRuntimeActor(id);
      if (expert) {
        return expert;
      }

      throw new Error(`Actor ${id} not found`);
    },
    async listForMemory() {
      const [agentEntries, expertEntries] = await Promise.all([
        agents.listForMemory(),
        experts.listForMemory(),
      ]);
      return [...agentEntries, ...expertEntries];
    },
  };

  const configuration = new ConfigurationService(configurationRepository);
  const tools = new ToolsService();
  const models = new ModelsService(tools);
  const prompts = new FileSystemPromptRegistry();
  const skills = new FileSystemSkillRegistry();
  const memory = new SystemMemoryProvider(registryLookup);
  const emails = new EmailsService(emailsRepository, new ResendEmailProvider(), configuration, {
    async getCeo() {
      const result = await agents.list({ limit: 100, offset: 0 });
      const ceo = result.agents.find((agent) => agent.isCeo);
      return ceo ? { id: ceo.id } : null;
    },
  });
  const emailPoller = new EmailPoller(emails, configuration);
  const executions = new ExecutionsService(
    registryLookup,
    tools,
    prompts,
    memory,
    executionsRepository,
    [
      new ClaudeCodeRunner(),
      new CodexRunner(),
      new OpenCodeRunner(),
      new GeminiCliRunner(),
      new KiloRunner(),
    ],
    skills,
  );
  experts = new ExpertsService(expertsRepository, agents, executions);
  const projectAgentLookup = {
    findCeo: () => agents.findCeo(),
    listForMemory: () => registryLookup.listForMemory(),
  };
  const projects = new ProjectsService(
    projectsRepository,
    tasksRepository,
    projectAgentLookup,
    executions,
  );
  const tasks = new TasksService(
    tasksRepository,
    taskEventsRepository,
    registryLookup,
    projects,
    executions,
  );

  const bootstrap = async (): Promise<void> => {
    await bootstrapDefaultAgents(agentsRepository);
  };

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
