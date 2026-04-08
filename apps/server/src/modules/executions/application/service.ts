import { cwd } from 'node:process';
import type { ZodError, ZodType } from 'zod';
import { InfrastructureError, ValidationError } from '../../../shared/errors/app-error.js';
import type { ExecutionRequest, ExecutionResult } from '../domain/execution.js';
import { EXECUTION_OPERATIONS } from './operations.js';
import { composePromptBlocks, serializePromptBlocks } from './prompt-composer.js';
import type {
  AgentLookup,
  MemoryProvider,
  ModelRunner,
  PromptRegistry,
  ToolStatusLookup,
} from './contracts.js';

function zodErrorToMessage(error: ZodError): string {
  return error.issues.map((issue) => `${issue.path.join('.') || 'root'}: ${issue.message}`).join('; ');
}

export class ExecutionsService {
  constructor(
    private readonly agents: AgentLookup,
    private readonly tools: ToolStatusLookup,
    private readonly prompts: PromptRegistry,
    private readonly memory: MemoryProvider,
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
    const memoryBlocks = await this.memory.build(
      {
        agent,
        context: input.context,
        operationKey: input.operationKey,
        userInput: input.userInput,
      },
      operation?.memoryKeys ?? [],
    );
    const staticBlocks = await Promise.all(
      (operation?.staticFragments ?? []).map(async (fragmentKey) => {
        const fragment = await this.prompts.getFragment(fragmentKey);
        return {
          content: fragment.content.trim(),
          key: fragment.key,
          kind: 'static' as const,
          source: 'static' as const,
          title: `Static Memory: ${fragment.key}`,
        };
      }),
    );

    const missingMemoryKeys = (operation?.memoryKeys ?? []).filter(
      (memoryKey) => !memoryBlocks.some((block) => block.key === memoryKey),
    );

    if (missingMemoryKeys.length > 0) {
      throw new InfrastructureError(`Missing required memory blocks: ${missingMemoryKeys.join(', ')}`);
    }

    const promptBlocks = composePromptBlocks({
      command: promptAsset.systemPrompt,
      context: input.context,
      memoryBlocks: [...staticBlocks, ...memoryBlocks],
      operationKey: input.operationKey,
      soul: agent.soul,
      userInput: input.userInput,
    });
    const composedPrompt = serializePromptBlocks(promptBlocks);

    const raw = await runner.run({
      cliId: availableTool.id,
      model: agent.model,
      prompt: composedPrompt,
      sandboxMode: input.sandboxMode ?? 'read-only',
      workingDirectory: input.workingDirectory ?? cwd(),
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

    return {
      composedPrompt,
      cliId: availableTool.id,
      durationMs: Date.now() - startedAt,
      executedAt: new Date().toISOString(),
      model: agent.model,
      promptBlocks,
      operationKey: input.operationKey,
      parsedOutput,
      promptPath: promptAsset.path,
      rawOutput: raw.rawOutput,
      validationError,
    };
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
