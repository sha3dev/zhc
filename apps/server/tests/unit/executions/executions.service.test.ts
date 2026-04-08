import { describe, expect, it, vi } from 'vitest';
import type { Agent } from '../../../src/modules/agents/domain/agent.js';
import { ExecutionsService } from '../../../src/modules/executions/application/service.js';
import type {
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
  key: 'ceo',
  modelCliId: 'codex',
  model: 'gpt-5.4',
  name: 'CEO',
  soul: '# CEO Soul\nYou coordinate work.',
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

function createPrompts(): PromptRegistry {
  return {
    getFragment: vi.fn(async (key: string) => ({
      content: `Fragment ${key}`,
      key,
      path: `/tmp/fragments/${key}.md`,
    })),
    get: vi.fn(async (operationKey: string): Promise<PromptAsset> => ({
      operationKey,
      path: `/tmp/${operationKey}.md`,
      systemPrompt: 'Return structured JSON.',
    })),
  };
}

function createMemoryProvider(): MemoryProvider {
  return {
    build: vi.fn(async (_input, memoryKeys) =>
      memoryKeys.includes('available_agents')
        ? [
            {
              content:
                '[{"id":1,"key":"ceo","name":"CEO","isCeo":true,"status":"ready","modelCliId":"codex","model":"gpt-5.4","role":"Chief Executive Officer"},{"id":2,"key":"backend-engineer","name":"Backend Engineer","isCeo":false,"status":"not_ready","modelCliId":null,"model":null,"role":"Backend Engineer"}]',
              key: 'available_agents',
              kind: 'memory',
              source: 'dynamic',
              title: 'Memory: Available Agents',
            },
          ]
        : [],
    ),
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
          items: [{ command: 'codex', id: 'codex', models: [], name: 'Codex', status: 'configured', version: '1.0.0' }],
        })),
      },
      createPrompts(),
      createMemoryProvider(),
      [],
    );

    await expect(
      service.execute({ agentId: 1, operationKey: 'create-project', userInput: 'build app' }),
    ).rejects.toBeInstanceOf(ValidationError);
  });

  it('composes the prompt in the expected order', async () => {
    const capture: { last?: ModelRunRequest } = {};
    const runner = createRunner('{"name":"x","definitionBrief":"y","tasks":[{"key":"task-1","title":"T","description":"D","sort":0,"dependsOnTaskKeys":[]}]}', capture);
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
    expect(prompt.indexOf('# Command')).toBeLessThan(prompt.indexOf('# Memory: Available Agents'));
    expect(prompt.indexOf('# Memory: Available Agents')).toBeLessThan(prompt.indexOf('# Execution Context'));
    expect(prompt.indexOf('# Execution Context')).toBeLessThan(prompt.indexOf('# User Input'));
  });

  it('returns parsed output when schema validation succeeds', async () => {
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
  });

  it('preserves raw output and returns a validation error when parsing fails', async () => {
    const rawOutput = '{"bad":"shape"}';
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
  });

  it('returns raw output for unstructured operations', async () => {
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
  });

  it('injects available_agents memory into create-project prompts', async () => {
    const capture: { last?: ModelRunRequest } = {};
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
      [createRunner('plain text response', capture)],
    );

    const result = await service.execute({
      agentId: 1,
      operationKey: 'create-project',
      userInput: 'build app',
    });

    expect(capture.last?.prompt).toContain('"key":"backend-engineer"');
    expect(capture.last?.prompt).toContain('"modelCliId":"codex"');
    expect(result.promptBlocks.some((block) => block.key === 'available_agents')).toBe(true);
  });

  it('fails when an operation requires memory that is not provided', async () => {
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
      [createRunner('plain text response')],
    );

    await expect(
      service.execute({
        agentId: 1,
        operationKey: 'create-project',
        userInput: 'build app',
      }),
    ).rejects.toThrow(/Missing required memory blocks/);
  });
});
