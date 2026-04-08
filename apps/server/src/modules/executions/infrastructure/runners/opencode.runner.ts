import type { ModelRunner, ModelRunRequest, ModelRunResponse } from '../../application/contracts.js';
import { assertSuccessfulRun, runCliCommand } from './shared.js';

function pickOutput(stdout: string, stderr: string): string {
  return stdout.trim() || stderr.trim();
}

export class OpenCodeRunner implements ModelRunner {
  readonly cliId = 'opencode';

  async run(input: ModelRunRequest): Promise<ModelRunResponse> {
    const args = ['run', '--model', input.model, input.prompt];

    const result = await runCliCommand('opencode', args, input.workingDirectory, null);
    assertSuccessfulRun('opencode', result.exitCode, result.stderr, result.stdout);

    return { rawOutput: pickOutput(result.stdout, result.stderr) };
  }
}
