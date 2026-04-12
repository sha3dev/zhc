import type {
  ModelRunRequest,
  ModelRunResponse,
  ModelRunner,
} from '../../application/contracts.js';
import { assertSuccessfulRun, runCliCommand } from './shared.js';

function pickOutput(stdout: string, stderr: string): string {
  return stdout.trim() || stderr.trim();
}

export class GeminiCliRunner implements ModelRunner {
  readonly cliId = 'gemini_cli';

  async run(input: ModelRunRequest): Promise<ModelRunResponse> {
    const args = ['-p', input.prompt, '-m', input.model, '--output-format', 'text'];

    const result = await runCliCommand('gemini', args, input.workingDirectory, null);
    assertSuccessfulRun('gemini', result.exitCode, result.stderr, result.stdout);

    return { rawOutput: pickOutput(result.stdout, result.stderr) };
  }
}
