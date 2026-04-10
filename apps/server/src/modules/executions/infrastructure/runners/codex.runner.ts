import { InfrastructureError } from '../../../../shared/errors/app-error.js';
import type {
  ModelRunRequest,
  ModelRunResponse,
  ModelRunner,
} from '../../application/contracts.js';
import { assertSuccessfulRun, readTempFile, runCliCommand, withTempFile } from './shared.js';

export class CodexRunner implements ModelRunner {
  readonly cliId = 'codex';

  async run(input: ModelRunRequest): Promise<ModelRunResponse> {
    return withTempFile('last-message.txt', async (outputPath) => {
      const args = [
        'exec',
        '-',
        '--model',
        input.model,
        '--skip-git-repo-check',
        '--sandbox',
        input.sandboxMode,
        '--color',
        'never',
        '--output-last-message',
        outputPath,
      ];

      const result = await runCliCommand('codex', args, input.workingDirectory, input.prompt);
      assertSuccessfulRun('codex', result.exitCode, result.stderr, result.stdout);

      const rawOutput = (await readTempFile(outputPath)).trim() || result.stdout.trim();
      if (/(^|\n)(?:\[[^\n]+\]\s*)?ERROR:/m.test(rawOutput)) {
        throw new InfrastructureError('codex execution returned an error response', {
          details: {
            rawOutput,
          },
        });
      }

      return { rawOutput };
    });
  }
}
