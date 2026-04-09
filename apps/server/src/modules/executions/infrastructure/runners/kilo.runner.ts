import type {
  ModelRunRequest,
  ModelRunResponse,
  ModelRunner,
} from '../../application/contracts.js';
import { assertSuccessfulRun, runCliCommand } from './shared.js';

function pickOutput(stdout: string, stderr: string): string {
  return stdout.trim() || stderr.trim();
}

export class KiloRunner implements ModelRunner {
  readonly cliId = 'kilo';

  async run(input: ModelRunRequest): Promise<ModelRunResponse> {
    const args = ['run', '--model', input.model, input.prompt];

    const result = await runCliCommand('kilo', args, input.workingDirectory, null);
    assertSuccessfulRun('kilo', result.exitCode, result.stderr, result.stdout);

    return { rawOutput: pickOutput(result.stdout, result.stderr) };
  }
}
