import type { ModelRunner, ModelRunRequest, ModelRunResponse } from '../../application/contracts.js';
import { assertSuccessfulRun, runCliCommand } from './shared.js';

export class ClaudeCodeRunner implements ModelRunner {
  readonly cliId = 'claude_code';

  async run(input: ModelRunRequest): Promise<ModelRunResponse> {
    const args = ['-p', input.prompt, '--model', input.model, '--output-format', 'text'];

    const result = await runCliCommand('claude', args, input.workingDirectory, null);
    assertSuccessfulRun('claude', result.exitCode, result.stderr, result.stdout);

    return { rawOutput: result.stdout.trim() };
  }
}
