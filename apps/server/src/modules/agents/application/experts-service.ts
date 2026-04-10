import { z } from 'zod';
import { NotFoundError, ValidationError } from '../../../shared/errors/app-error.js';
import type { ExecutionsService } from '../../executions/application/service.js';
import type { Agent } from '../domain/agent.js';
import type {
  Expert,
  ExpertDetails,
  RegistryEntityMemorySummary,
  RuntimeActor,
} from '../domain/expert.js';
import type {
  CreateExpertInput,
  ExpertsRepository,
  ListExpertsQuery,
  UpdateExpertInput,
} from './experts-contracts.js';

export const createExpertDraftOutputSchema = z.object({
  name: z.string().trim().min(1).max(255),
  subagentMd: z.string().trim().min(50).max(100000),
});

export interface CreateExpertDraftInput {
  brief: string;
}

export class ExpertsService {
  constructor(
    private readonly repository: ExpertsRepository,
    private readonly ceoLookup: { findCeo(): Promise<Agent | null> },
    private readonly executions: ExecutionsService,
  ) {}

  async archive(id: number): Promise<boolean> {
    const expert = await this.repository.findById(id);

    if (!expert) {
      throw new NotFoundError(`Expert ${id} not found`);
    }

    return this.repository.archive(id);
  }

  async create(input: CreateExpertInput): Promise<Expert> {
    await this.ensureCeoReady();
    return this.repository.create(input);
  }

  async createDraft(
    input: CreateExpertDraftInput,
  ): Promise<z.infer<typeof createExpertDraftOutputSchema>> {
    const ceo = await this.ensureCeoReady();

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

  async getById(id: number): Promise<ExpertDetails> {
    const expert = await this.repository.findByIdWithRelations(id);

    if (!expert) {
      throw new NotFoundError(`Expert ${id} not found`);
    }
    return expert;
  }

  async list(query: ListExpertsQuery): Promise<{ experts: Expert[]; total: number }> {
    return this.repository.findAll(query);
  }

  async update(id: number, input: UpdateExpertInput): Promise<Expert> {
    const expert = await this.repository.findById(id);

    if (!expert) {
      throw new NotFoundError(`Expert ${id} not found`);
    }

    const updated = await this.repository.update(id, input);

    if (!updated) {
      throw new NotFoundError(`Expert ${id} not found`);
    }

    return updated;
  }

  async listForMemory(): Promise<RegistryEntityMemorySummary[]> {
    return this.repository.findForMemory(await this.getCeoRuntime());
  }

  async findRuntimeActor(id: number): Promise<RuntimeActor | null> {
    return this.repository.findRuntimeActorById(id, await this.getCeoRuntime());
  }

  private async ensureCeoReady(): Promise<Agent> {
    const ceo = await this.ceoLookup.findCeo();

    if (!ceo) {
      throw new ValidationError('Cannot manage experts because the CEO does not exist');
    }

    if (ceo.status !== 'ready') {
      throw new ValidationError('Cannot manage experts because the CEO is not ready');
    }

    return ceo;
  }

  private async getCeoRuntime(): Promise<RuntimeActor | null> {
    const ceo = await this.ceoLookup.findCeo();
    if (!ceo) {
      return null;
    }

    return {
      ...ceo,
      kind: ceo.kind,
    };
  }
}
