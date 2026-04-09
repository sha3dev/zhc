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
  private readonly operationalKinds = ['ceo', 'specialist'] as const;

  constructor(private readonly repository: AgentsRepository) {}

  async archive(id: number): Promise<boolean> {
    const agent = await this.repository.findById(id);
    if (!agent || agent.kind === 'expert') {
      throw new NotFoundError(`Agent ${id} not found`);
    }

    return this.repository.archive(id);
  }

  create(input: CreateAgentInput): Promise<Agent> {
    return this.repository.create({
      ...input,
      kind: input.isCeo ? 'ceo' : 'specialist',
    });
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

    if (!agent || agent.kind === 'expert') {
      throw new NotFoundError(`Agent ${id} not found`);
    }

    return agent;
  }

  list(query: ListAgentsQuery): Promise<{ agents: Agent[]; total: number }> {
    return this.repository.findAll({ ...query, kinds: [...this.operationalKinds] });
  }

  async update(id: number, input: UpdateAgentInput): Promise<Agent> {
    const current = await this.repository.findById(id);

    if (!current || current.kind === 'expert') {
      throw new NotFoundError(`Agent ${id} not found`);
    }

    const updated = await this.repository.update(id, input);

    if (!updated) {
      throw new NotFoundError(`Agent ${id} not found`);
    }

    return updated;
  }

  findCeo(): Promise<Agent | null> {
    return this.repository.findCeo();
  }
}
