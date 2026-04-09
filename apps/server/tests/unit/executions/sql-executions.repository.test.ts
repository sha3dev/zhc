import { beforeEach, describe, expect, it, vi } from 'vitest';
import { SqlExecutionsRepository } from '../../../src/modules/executions/infrastructure/sql-executions.repository.js';

const { queryMock } = vi.hoisted(() => ({
  queryMock: vi.fn(),
}));

vi.mock('../../../src/shared/db/client.js', () => ({
  query: queryMock,
}));

function createRow(overrides: Record<string, unknown> = {}) {
  return {
    agn_id: 1,
    agent_name: 'CEO',
    exe_cli_id: 'codex',
    exe_composed_prompt: 'Prompt body',
    exe_context_json: { repo: 'zhc' },
    exe_created_at: new Date('2026-04-09T10:00:00.000Z'),
    exe_duration_ms: 12,
    exe_executed_at: new Date('2026-04-09T10:00:00.000Z'),
    exe_id: 1,
    exe_model: 'gpt-5.4',
    exe_operation_key: 'create-project',
    exe_parsed_output_json: { ok: true },
    exe_prompt_blocks_json: [],
    exe_prompt_path: '/tmp/create-project.md',
    exe_raw_output: 'Model response',
    exe_sandbox_mode: 'read-only',
    exe_user_input: 'build app',
    exe_validation_error: null,
    exe_working_directory: '/tmp',
    prompt_preview: 'Prompt body',
    response_preview: 'Model response',
    ...overrides,
  };
}

describe('SqlExecutionsRepository', () => {
  beforeEach(() => {
    queryMock.mockReset();
  });

  it('inserts an execution and hydrates the persisted detail', async () => {
    queryMock
      .mockResolvedValueOnce({ rows: [{ exe_id: 11 }] })
      .mockResolvedValueOnce({ rows: [createRow({ exe_id: 11 })] });

    const repository = new SqlExecutionsRepository();
    const result = await repository.create({
      agentId: 1,
      cliId: 'codex',
      composedPrompt: 'Prompt body',
      context: { repo: 'zhc' },
      durationMs: 12,
      executedAt: new Date('2026-04-09T10:00:00.000Z'),
      model: 'gpt-5.4',
      operationKey: 'create-project',
      parsedOutput: { ok: true },
      promptBlocks: [],
      promptPath: '/tmp/create-project.md',
      rawOutput: 'Model response',
      sandboxMode: 'read-only',
      userInput: 'build app',
      validationError: null,
      workingDirectory: '/tmp',
    });

    expect(result.id).toBe(11);
    expect(queryMock).toHaveBeenCalledTimes(2);
    expect(queryMock.mock.calls[0]?.[0]).toContain('INSERT INTO execution');
  });

  it('lists executions ordered by executedAt desc and applies filters', async () => {
    queryMock
      .mockResolvedValueOnce({ rows: [{ total: '1' }] })
      .mockResolvedValueOnce({ rows: [createRow()] });

    const repository = new SqlExecutionsRepository();
    const result = await repository.list({
      agentId: 1,
      cliId: 'codex',
      limit: 20,
      model: 'gpt-5.4',
      offset: 0,
      operationKey: 'create-project',
      search: 'Prompt',
    });

    expect(result.total).toBe(1);
    expect(result.executions[0]).toMatchObject({
      cliId: 'codex',
      model: 'gpt-5.4',
      operationKey: 'create-project',
    });
    expect(queryMock.mock.calls[1]?.[0]).toContain('ORDER BY execution.exe_executed_at DESC');
    expect(queryMock.mock.calls[1]?.[0]).toContain('execution.agn_id = $1');
    expect(queryMock.mock.calls[1]?.[0]).toContain('execution.exe_operation_key = $2');
    expect(queryMock.mock.calls[1]?.[0]).toContain('execution.exe_cli_id = $3');
    expect(queryMock.mock.calls[1]?.[0]).toContain('execution.exe_model = $4');
  });
});
