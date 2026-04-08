import type { ModelRunner, ModelRunRequest, ModelRunResponse } from '../../application/contracts.js';
import {
  assertSuccessfulRun,
  readTempFile,
  runCliCommand,
  withTempFile,
} from './shared.js';

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
      return { rawOutput };
    });
  }
}
