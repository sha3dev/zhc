import type {
  ModelRunRequest,
  ModelRunResponse,
  ModelRunner,
} from '../../application/contracts.js';
import { assertSuccessfulRun, runCliCommand } from './shared.js';

function pickOutput(stdout: string, stderr: string): string {
  const lines = stdout
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);

  const textParts: string[] = [];
  for (const line of lines) {
    try {
      const parsed = JSON.parse(line) as {
        part?: { text?: string; type?: string };
        type?: string;
      };
      if (parsed.type === 'text' && typeof parsed.part?.text === 'string') {
        textParts.push(parsed.part.text);
      }
    } catch {
      return stdout.trim() || stderr.trim();
    }
  }

  if (textParts.length > 0) {
    return textParts.join('\n').trim();
  }

  return stdout.trim() || stderr.trim();
}

export class OpenCodeRunner implements ModelRunner {
  readonly cliId = 'opencode';

  async run(input: ModelRunRequest): Promise<ModelRunResponse> {
    const args = ['run', '--pure', '--format', 'json', '--model', input.model, input.prompt];

    const result = await runCliCommand(
      'opencode',
      args,
      input.workingDirectory,
      null,
      input.timeoutMs,
    );
    assertSuccessfulRun('opencode', result.exitCode, result.stderr, result.stdout);

    return { rawOutput: pickOutput(result.stdout, result.stderr) };
  }
}
