import { z } from 'zod';
import { NotFoundError, ValidationError } from '../../../shared/errors/app-error.js';
import type { ExecutionsService } from '../../executions/application/service.js';
import type { Agent, AgentDetails } from '../domain/agent.js';
import type { AgentsRepository, ListAgentsQuery, UpdateAgentInput } from './contracts.js';

export const createExpertDraftOutputSchema = z.object({
  name: z.string().trim().min(1).max(255),
  subagentMd: z.string().trim().min(50).max(100000),
});

export interface CreateExpertInput {
  name: string;
  subagentMd: string;
}

export interface CreateExpertDraftInput {
  brief: string;
}

export class ExpertsService {
  constructor(
    private readonly repository: AgentsRepository,
    private readonly executions: ExecutionsService,
  ) {}

  async archive(id: number): Promise<boolean> {
    const expert = await this.repository.findById(id);

    if (!expert || expert.kind !== 'expert') {
      throw new NotFoundError(`Expert ${id} not found`);
    }

    return this.repository.archive(id);
  }

  create(input: CreateExpertInput): Promise<Agent> {
    return this.repository.create({
      isCeo: false,
      kind: 'expert',
      model: null,
      modelCliId: null,
      name: input.name,
      status: 'not_ready',
      subagentMd: input.subagentMd,
    });
  }

  async createDraft(
    input: CreateExpertDraftInput,
  ): Promise<z.infer<typeof createExpertDraftOutputSchema>> {
    const ceo = await this.repository.findCeo();

    if (!ceo) {
      throw new ValidationError('Cannot create expert draft because the CEO does not exist');
    }

    if (ceo.status !== 'ready') {
      throw new ValidationError('Cannot create expert draft because the CEO is not ready');
    }

    const result = await this.executions.execute({
      agentId: ceo.id,
      operationKey: 'create-expert-draft',
      outputSchema: createExpertDraftOutputSchema,
      userInput: input.brief,
    });

    if (!result.parsedOutput) {
      throw new ValidationError(
        result.validationError ?? 'Expert draft generator returned invalid output',
      );
    }

    return result.parsedOutput;
  }

  async getById(id: number): Promise<AgentDetails> {
    const expert = await this.repository.findByIdWithRelations(id);

    if (!expert || expert.kind !== 'expert') {
      throw new NotFoundError(`Expert ${id} not found`);
    }

    return {
      ...expert,
      manages: [],
    };
  }

  list(query: ListAgentsQuery): Promise<{ agents: Agent[]; total: number }> {
    return this.repository.findAll({ ...query, kinds: ['expert'] });
  }

  async update(id: number, input: UpdateAgentInput): Promise<Agent> {
    const expert = await this.repository.findById(id);

    if (!expert || expert.kind !== 'expert') {
      throw new NotFoundError(`Expert ${id} not found`);
    }

    const updated = await this.repository.update(id, {
      ...input,
      kind: 'expert',
      model: null,
      modelCliId: null,
    });

    if (!updated) {
      throw new NotFoundError(`Expert ${id} not found`);
    }

    return updated;
  }
}
