import { NotFoundError } from '../../../shared/errors/app-error.js';
import type {
  Agent,
  AgentDetails,
  AgentHierarchyNode,
  AgentMemorySummary,
  AgentStats,
} from '../domain/agent.js';
import type {
  AgentsRepository,
  CreateAgentInput,
  ListAgentsQuery,
  UpdateAgentInput,
} from './contracts.js';

export class AgentsService {
  constructor(private readonly repository: AgentsRepository) {}

  archive(id: number): Promise<boolean> {
    return this.repository.archive(id);
  }

  create(input: CreateAgentInput): Promise<Agent> {
    return this.repository.create(input);
  }

  getHierarchy(): Promise<AgentHierarchyNode[]> {
    return this.repository.getHierarchy();
  }

  listForMemory(): Promise<AgentMemorySummary[]> {
    return this.repository.findForMemory();
  }

  getStats(): Promise<AgentStats> {
    return this.repository.getStats();
  }

  async getById(id: number): Promise<AgentDetails> {
    const agent = await this.repository.findByIdWithRelations(id);

    if (!agent) {
      throw new NotFoundError(`Agent ${id} not found`);
    }

    return agent;
  }

  list(query: ListAgentsQuery): Promise<{ agents: Agent[]; total: number }> {
    return this.repository.findAll(query);
  }

  async update(id: number, input: UpdateAgentInput): Promise<Agent> {
    const updated = await this.repository.update(id, input);

    if (!updated) {
      throw new NotFoundError(`Agent ${id} not found`);
    }

    return updated;
  }
}
