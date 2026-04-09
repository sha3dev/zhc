import { describe, expect, it, vi } from 'vitest';
import type { Agent } from '../../../src/modules/agents/domain/agent.js';
import { ExecutionsService } from '../../../src/modules/executions/application/service.js';
import type {
  ExecutionDetails,
  MemoryProvider,
  ModelRunRequest,
  ModelRunResponse,
  ModelRunner,
  PromptAsset,
  PromptRegistry,
} from '../../../src/modules/executions/index.js';
import { ValidationError } from '../../../src/shared/errors/app-error.js';

const createAgent = (overrides: Partial<Agent> = {}): Agent => ({
  createdAt: new Date(),
  id: 1,
  isCeo: true,
  kind: 'ceo',
  key: 'ceo',
  modelCliId: 'codex',
  model: 'gpt-5.4',
  name: 'CEO',
  subagentMd: '# CEO\n\n## Role\nChief Executive Officer\n\nYou coordinate work.',
  status: 'ready',
  updatedAt: new Date(),
  ...overrides,
});

function createRunner(rawOutput: string, capture: { last?: ModelRunRequest } = {}): ModelRunner {
  return {
    cliId: 'codex',
    run: vi.fn(async (input: ModelRunRequest): Promise<ModelRunResponse> => {
      capture.last = input;
      return { rawOutput };
    }),
  };
}

function createExecutionRepository() {
  return {
    create: vi.fn(
      async (input) =>
        ({
          agentId: input.agentId,
          agentName: 'CEO',
          cliId: input.cliId,
          composedPrompt: input.composedPrompt,
          context: input.context,
          durationMs: input.durationMs,
          executedAt: input.executedAt,
          id: 77,
          model: input.model,
          operationKey: input.operationKey,
          parsedOutput: input.parsedOutput,
          promptBlocks: input.promptBlocks,
          promptPath: input.promptPath,
          promptPreview: input.composedPrompt.slice(0, 140),
          rawOutput: input.rawOutput,
          responsePreview: input.rawOutput.slice(0, 140),
          sandboxMode: input.sandboxMode,
          userInput: input.userInput,
          validationError: input.validationError,
          workingDirectory: input.workingDirectory,
        }) satisfies ExecutionDetails,
    ),
    findById: vi.fn(),
    list: vi.fn(),
  };
}

function createPrompts(): PromptRegistry {
  return {
    getFragment: vi.fn(async (key: string) => ({
      content:
        key === 'general-rules' ? 'Produce all generated content in English.' : `Fragment ${key}`,
      key,
      path: `/tmp/fragments/${key}.md`,
    })),
    get: vi.fn(
      async (operationKey: string): Promise<PromptAsset> => ({
        operationKey,
        path: `/tmp/${operationKey}.md`,
        systemPrompt: 'Return structured JSON.',
      }),
    ),
  };
}

function createMemoryProvider(): MemoryProvider {
  return {
    build: vi.fn(async (_input, memoryKeys) => [
      ...(memoryKeys.includes('available_agents')
        ? [
            {
              content:
                '[{"id":1,"key":"ceo","name":"CEO","isCeo":true,"kind":"ceo","status":"ready","modelCliId":"codex","model":"gpt-5.4","role":"Chief Executive Officer"},{"id":2,"key":"backend-engineer","name":"Backend Engineer","isCeo":false,"kind":"specialist","status":"not_ready","modelCliId":null,"model":null,"role":"Backend Engineer"}]',
              key: 'available_agents',
              kind: 'memory' as const,
              source: 'dynamic' as const,
              title: 'Memory: Available Agents',
            },
          ]
        : []),
      ...(memoryKeys.includes('available_experts')
        ? [
            {
              content:
                '[{"id":9,"key":"crossfit-expert","name":"CrossFit Expert","isCeo":false,"kind":"expert","status":"not_ready","modelCliId":null,"model":null,"role":"CrossFit Expert"}]',
              key: 'available_experts',
              kind: 'memory' as const,
              source: 'dynamic' as const,
              title: 'Memory: Available Experts',
            },
          ]
        : []),
    ]),
  };
}

describe('ExecutionsService', () => {
  it('rejects execution for an unknown agent', async () => {
    const service = new ExecutionsService(
      {
        getById: vi.fn(async () => {
          throw new ValidationError('Agent not found');
        }),
        listForMemory: vi.fn(),
      },
      { listStatus: vi.fn() },
      createPrompts(),
      createMemoryProvider(),
      createExecutionRepository(),
      [],
    );

    await expect(
      service.execute({ agentId: 99, operationKey: 'create-project', userInput: 'build app' }),
    ).rejects.toBeInstanceOf(ValidationError);
  });

  it('rejects not_ready agents', async () => {
    const service = new ExecutionsService(
      { getById: vi.fn(async () => createAgent({ status: 'not_ready' })), listForMemory: vi.fn() },
      { listStatus: vi.fn() },
      createPrompts(),
      createMemoryProvider(),
      createExecutionRepository(),
      [],
    );

    await expect(
      service.execute({ agentId: 1, operationKey: 'create-project', userInput: 'build app' }),
    ).rejects.toBeInstanceOf(ValidationError);
  });

  it('rejects agents without a model', async () => {
    const service = new ExecutionsService(
      { getById: vi.fn(async () => createAgent({ model: null })), listForMemory: vi.fn() },
      { listStatus: vi.fn() },
      createPrompts(),
      createMemoryProvider(),
      createExecutionRepository(),
      [],
    );

    await expect(
      service.execute({ agentId: 1, operationKey: 'create-project', userInput: 'build app' }),
    ).rejects.toBeInstanceOf(ValidationError);
  });

  it('rejects agents without a model cli', async () => {
    const service = new ExecutionsService(
      { getById: vi.fn(async () => createAgent({ modelCliId: null })), listForMemory: vi.fn() },
      { listStatus: vi.fn() },
      createPrompts(),
      createMemoryProvider(),
      createExecutionRepository(),
      [],
    );

    await expect(
      service.execute({ agentId: 1, operationKey: 'create-project', userInput: 'build app' }),
    ).rejects.toBeInstanceOf(ValidationError);
  });

  it('fails when the model is not available from a configured CLI', async () => {
    const service = new ExecutionsService(
      { getById: vi.fn(async () => createAgent()), listForMemory: vi.fn() },
      {
        listStatus: vi.fn(async () => ({
          cachedAt: null,
          items: [
            {
              command: 'codex',
              id: 'codex',
              models: [],
              name: 'Codex',
              status: 'configured',
              version: '1.0.0',
            },
          ],
        })),
      },
      createPrompts(),
      createMemoryProvider(),
      createExecutionRepository(),
      [],
    );

    await expect(
      service.execute({ agentId: 1, operationKey: 'create-project', userInput: 'build app' }),
    ).rejects.toBeInstanceOf(ValidationError);
  });

  it('composes the prompt in the expected order', async () => {
    const capture: { last?: ModelRunRequest } = {};
    const runner = createRunner(
      '{"name":"x","definitionBrief":"y","tasks":[{"key":"task-1","title":"T","description":"D","sort":0,"dependsOnTaskKeys":[]}]}',
      capture,
    );
    const repository = createExecutionRepository();
    const service = new ExecutionsService(
      { getById: vi.fn(async () => createAgent()), listForMemory: vi.fn() },
      {
        listStatus: vi.fn(async () => ({
          cachedAt: null,
          items: [
            {
              command: 'codex',
              id: 'codex',
              models: ['gpt-5.4'],
              name: 'Codex',
              status: 'configured',
              version: '1.0.0',
            },
          ],
        })),
      },
      createPrompts(),
      createMemoryProvider(),
      repository,
      [runner],
    );

    await service.execute({
      agentId: 1,
      context: { repo: 'zhc' },
      operationKey: 'create-project',
      userInput: 'build an app',
    });

    const prompt = capture.last?.prompt ?? '';
    expect(prompt.indexOf('# Agent Identity')).toBeLessThan(prompt.indexOf('# Command'));
    expect(prompt.indexOf('# Command')).toBeLessThan(prompt.indexOf('# General Rules'));
    expect(prompt.indexOf('# General Rules')).toBeLessThan(
      prompt.indexOf('# Memory: Available Agents'),
    );
    expect(prompt.indexOf('# Memory: Available Agents')).toBeLessThan(
      prompt.indexOf('# Memory: Available Experts'),
    );
    expect(prompt.indexOf('# Memory: Available Experts')).toBeLessThan(
      prompt.indexOf('# Execution Context'),
    );
    expect(prompt.indexOf('# Execution Context')).toBeLessThan(prompt.indexOf('# User Input'));
    expect(repository.create).toHaveBeenCalledTimes(1);
  });

  it('returns parsed output when schema validation succeeds', async () => {
    const repository = createExecutionRepository();
    const service = new ExecutionsService(
      { getById: vi.fn(async () => createAgent()), listForMemory: vi.fn() },
      {
        listStatus: vi.fn(async () => ({
          cachedAt: null,
          items: [
            {
              command: 'codex',
              id: 'codex',
              models: ['gpt-5.4'],
              name: 'Codex',
              status: 'configured',
              version: '1.0.0',
            },
          ],
        })),
      },
      createPrompts(),
      createMemoryProvider(),
      repository,
      [
        createRunner(
          '{"name":"Launch Site","definitionBrief":"Build it","tasks":[{"key":"spec","title":"Spec","description":"Write spec","sort":0,"assignedToAgentKey":"product-designer","dependsOnTaskKeys":[]}]}',
        ),
      ],
    );

    const result = await service.execute({
      agentId: 1,
      operationKey: 'create-project',
      userInput: 'build app',
    });

    expect(result.validationError).toBeNull();
    expect(result.parsedOutput).toMatchObject({ name: 'Launch Site' });
    expect(result.id).toBe(77);
    expect(repository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        agentId: 1,
        context: null,
        model: 'gpt-5.4',
        operationKey: 'create-project',
        parsedOutput: expect.objectContaining({ name: 'Launch Site' }),
        userInput: 'build app',
      }),
    );
  });

  it('preserves raw output and returns a validation error when parsing fails', async () => {
    const rawOutput = '{"bad":"shape"}';
    const repository = createExecutionRepository();
    const service = new ExecutionsService(
      { getById: vi.fn(async () => createAgent()), listForMemory: vi.fn() },
      {
        listStatus: vi.fn(async () => ({
          cachedAt: null,
          items: [
            {
              command: 'codex',
              id: 'codex',
              models: ['gpt-5.4'],
              name: 'Codex',
              status: 'configured',
              version: '1.0.0',
            },
          ],
        })),
      },
      createPrompts(),
      createMemoryProvider(),
      repository,
      [createRunner(rawOutput)],
    );

    const result = await service.execute({
      agentId: 1,
      operationKey: 'create-project',
      userInput: 'build app',
    });

    expect(result.rawOutput).toBe(rawOutput);
    expect(result.parsedOutput).toBeNull();
    expect(result.validationError).toBeTruthy();
    expect(repository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        parsedOutput: null,
        rawOutput,
        validationError: expect.any(String),
      }),
    );
  });

  it('returns raw output for unstructured operations', async () => {
    const repository = createExecutionRepository();
    const service = new ExecutionsService(
      { getById: vi.fn(async () => createAgent()), listForMemory: vi.fn() },
      {
        listStatus: vi.fn(async () => ({
          cachedAt: null,
          items: [
            {
              command: 'codex',
              id: 'codex',
              models: ['gpt-5.4'],
              name: 'Codex',
              status: 'configured',
              version: '1.0.0',
            },
          ],
        })),
      },
      createPrompts(),
      createMemoryProvider(),
      repository,
      [createRunner('plain text response')],
    );

    const result = await service.execute({
      agentId: 1,
      operationKey: 'freeform-note',
      userInput: 'hello',
    });

    expect(result.rawOutput).toBe('plain text response');
    expect(result.parsedOutput).toBeNull();
    expect(result.validationError).toBeNull();
    expect(repository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        context: null,
        sandboxMode: 'read-only',
        workingDirectory: expect.any(String),
      }),
    );
  });

  it('injects available_agents and available_experts memory into create-project prompts', async () => {
    const capture: { last?: ModelRunRequest } = {};
    const repository = createExecutionRepository();
    const service = new ExecutionsService(
      { getById: vi.fn(async () => createAgent()), listForMemory: vi.fn() },
      {
        listStatus: vi.fn(async () => ({
          cachedAt: null,
          items: [
            {
              command: 'codex',
              id: 'codex',
              models: ['gpt-5.4'],
              name: 'Codex',
              status: 'configured',
              version: '1.0.0',
            },
          ],
        })),
      },
      createPrompts(),
      createMemoryProvider(),
      repository,
      [createRunner('plain text response', capture)],
    );

    const result = await service.execute({
      agentId: 1,
      operationKey: 'create-project',
      userInput: 'build app',
    });

    expect(capture.last?.prompt).toContain('"key":"backend-engineer"');
    expect(capture.last?.prompt).toContain('"key":"crossfit-expert"');
    expect(capture.last?.prompt).toContain('Produce all generated content in English.');
    expect(capture.last?.prompt).toContain('"modelCliId":"codex"');
    expect(result.promptBlocks.some((block) => block.key === 'available_agents')).toBe(true);
    expect(result.promptBlocks.some((block) => block.key === 'available_experts')).toBe(true);
    expect(result.promptBlocks.some((block) => block.key === 'general-rules')).toBe(true);
    expect(repository.create).toHaveBeenCalledTimes(1);
  });

  it('fails when an operation requires memory that is not provided', async () => {
    const repository = createExecutionRepository();
    const service = new ExecutionsService(
      { getById: vi.fn(async () => createAgent()), listForMemory: vi.fn() },
      {
        listStatus: vi.fn(async () => ({
          cachedAt: null,
          items: [
            {
              command: 'codex',
              id: 'codex',
              models: ['gpt-5.4'],
              name: 'Codex',
              status: 'configured',
              version: '1.0.0',
            },
          ],
        })),
      },
      createPrompts(),
      { build: vi.fn(async () => []) },
      repository,
      [createRunner('plain text response')],
    );

    await expect(
      service.execute({
        agentId: 1,
        operationKey: 'create-project',
        userInput: 'build app',
      }),
    ).rejects.toThrow(/Missing required memory blocks/);
    expect(repository.create).not.toHaveBeenCalled();
  });
});
