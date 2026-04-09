import { cwd } from 'node:process';
import type { ZodError, ZodType } from 'zod';
import {
  InfrastructureError,
  NotFoundError,
  ValidationError,
} from '../../../shared/errors/app-error.js';
import type { ExecutionDetails, ExecutionRequest, ExecutionResult } from '../domain/execution.js';
import type {
  AgentLookup,
  ExecutionRepositoryLookup,
  MemoryProvider,
  ModelRunner,
  PromptRegistry,
  ToolStatusLookup,
} from './contracts.js';
import type { ListExecutionsQuery } from './execution-contracts.js';
import { EXECUTION_OPERATIONS } from './operations.js';
import { composePromptBlocks, serializePromptBlocks } from './prompt-composer.js';

function zodErrorToMessage(error: ZodError): string {
  return error.issues
    .map((issue) => `${issue.path.join('.') || 'root'}: ${issue.message}`)
    .join('; ');
}

function createStaticPromptBlock(fragment: { content: string; key: string }) {
  return {
    content: fragment.content.trim(),
    key: fragment.key,
    kind: 'static' as const,
    source: 'static' as const,
    title: fragment.key === 'general-rules' ? 'General Rules' : `Static Memory: ${fragment.key}`,
  };
}

export class ExecutionsService {
  constructor(
    private readonly agents: AgentLookup,
    private readonly tools: ToolStatusLookup,
    private readonly prompts: PromptRegistry,
    private readonly memory: MemoryProvider,
    private readonly repository: ExecutionRepositoryLookup,
    private readonly runners: ModelRunner[],
  ) {}

  async execute<TParsed = unknown>(
    input: ExecutionRequest<TParsed>,
  ): Promise<ExecutionResult<TParsed>> {
    const startedAt = Date.now();
    const agent = await this.agents.getById(input.agentId);

    if (agent.status !== 'ready') {
      throw new ValidationError(`Agent ${agent.id} is not ready`);
    }

    if (!agent.model) {
      throw new ValidationError(`Agent ${agent.id} has no model assigned`);
    }

    if (!agent.modelCliId) {
      throw new ValidationError(`Agent ${agent.id} has no model CLI assigned`);
    }

    const { items: tools } = await this.tools.listStatus();
    const availableTool = tools.find(
      (tool) =>
        tool.id === agent.modelCliId &&
        tool.status === 'configured' &&
        tool.models.includes(agent.model as string),
    );

    if (!availableTool) {
      throw new ValidationError(
        `Model ${agent.model} is not available from configured CLI ${agent.modelCliId}`,
      );
    }

    const runner = this.runners.find((candidate) => candidate.cliId === availableTool.id);

    if (!runner) {
      throw new InfrastructureError(`No runner is registered for CLI ${availableTool.id}`);
    }

    const operation = EXECUTION_OPERATIONS[input.operationKey];
    const promptAsset = await this.prompts.get(input.operationKey);
    const generalRulesFragment = await this.prompts.getFragment('general-rules');
    const memoryBlocks = await this.memory.build(
      {
        agent,
        context: input.context,
        operationKey: input.operationKey,
        userInput: input.userInput,
      },
      operation?.memoryKeys ?? [],
    );
    const staticBlocks = [
      createStaticPromptBlock(generalRulesFragment),
      ...(await Promise.all(
        (operation?.staticFragments ?? []).map(async (fragmentKey) =>
          createStaticPromptBlock(await this.prompts.getFragment(fragmentKey)),
        ),
      )),
    ];

    const missingMemoryKeys = (operation?.memoryKeys ?? []).filter(
      (memoryKey) => !memoryBlocks.some((block) => block.key === memoryKey),
    );

    if (missingMemoryKeys.length > 0) {
      throw new InfrastructureError(
        `Missing required memory blocks: ${missingMemoryKeys.join(', ')}`,
      );
    }

    const promptBlocks = composePromptBlocks({
      command: promptAsset.systemPrompt,
      context: input.context,
      memoryBlocks: [...staticBlocks, ...memoryBlocks],
      operationKey: input.operationKey,
      subagentMd: agent.subagentMd,
      userInput: input.userInput,
    });
    const composedPrompt = serializePromptBlocks(promptBlocks);

    const sandboxMode = input.sandboxMode ?? 'read-only';
    const workingDirectory = input.workingDirectory ?? cwd();
    const raw = await runner.run({
      cliId: availableTool.id,
      model: agent.model,
      prompt: composedPrompt,
      sandboxMode,
      workingDirectory,
    });

    const schema = this.resolveSchema(input.operationKey, input.outputSchema);
    let parsedOutput: TParsed | null = null;
    let validationError: string | null = null;

    if (schema) {
      const parsed = schema.safeParse(this.tryParseJson(raw.rawOutput));
      if (parsed.success) {
        parsedOutput = parsed.data;
      } else {
        validationError = zodErrorToMessage(parsed.error);
      }
    }

    const persisted = await this.repository.create({
      agentId: agent.id,
      cliId: availableTool.id,
      composedPrompt,
      context: input.context ?? null,
      durationMs: Date.now() - startedAt,
      executedAt: new Date(),
      model: agent.model,
      operationKey: input.operationKey,
      parsedOutput,
      promptBlocks,
      promptPath: promptAsset.path,
      rawOutput: raw.rawOutput,
      sandboxMode,
      userInput: input.userInput,
      validationError,
      workingDirectory,
    });

    return {
      agentId: agent.id,
      composedPrompt,
      cliId: availableTool.id,
      context: input.context,
      durationMs: persisted.durationMs,
      executedAt: persisted.executedAt.toISOString(),
      id: persisted.id,
      model: agent.model,
      promptBlocks,
      operationKey: input.operationKey,
      parsedOutput,
      promptPath: promptAsset.path,
      rawOutput: raw.rawOutput,
      sandboxMode,
      userInput: input.userInput,
      validationError,
      workingDirectory,
    };
  }

  async getById(id: number): Promise<ExecutionDetails> {
    const execution = await this.repository.findById(id);

    if (!execution) {
      throw new NotFoundError(`Execution ${id} not found`);
    }

    return execution;
  }

  list(query: ListExecutionsQuery) {
    return this.repository.list(query);
  }

  private resolveSchema<TParsed>(
    operationKey: string,
    outputSchema?: ZodType<TParsed>,
  ): ZodType<TParsed> | undefined {
    if (outputSchema) {
      return outputSchema;
    }

    const operation = EXECUTION_OPERATIONS[operationKey];
    return operation?.outputSchema as ZodType<TParsed> | undefined;
  }

  private tryParseJson(rawOutput: string): unknown {
    try {
      return JSON.parse(rawOutput);
    } catch {
      return rawOutput;
    }
  }
}
