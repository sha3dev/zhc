import { spawn } from 'node:child_process';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { InfrastructureError } from '../../../../shared/errors/app-error.js';
import { logger } from '../../../../shared/observability/logger.js';
import { resolveCliCommand } from '../../../../shared/system/cli-resolver.js';

const NONINTERACTIVE_ENV = {
  ...process.env,
  CI: '1',
  FORCE_COLOR: '0',
  NO_COLOR: '1',
  TERM: 'dumb',
};

const DEFAULT_CLI_RUN_TIMEOUT_MS = 300_000;

interface SpawnResult {
  exitCode: number | null;
  stderr: string;
  stdout: string;
}

export async function runCliCommand(
  command: string,
  args: string[],
  workingDirectory: string,
  stdin: string | null,
  timeoutMs: number = DEFAULT_CLI_RUN_TIMEOUT_MS,
): Promise<SpawnResult> {
  const resolvedCommand = await resolveCliCommand(command);
  if (!resolvedCommand) {
    throw new InfrastructureError(`CLI command ${command} is not available`, {
      details: {
        command,
        path: process.env.PATH ?? '',
      },
    });
  }

  return await new Promise((resolve, reject) => {
    const startedAt = Date.now();
    let settled = false;
    const child = spawn(resolvedCommand, args, {
      cwd: workingDirectory,
      env: NONINTERACTIVE_ENV,
      stdio: ['pipe', 'pipe', 'pipe'],
    });
    logger.info('CLI start', {
      args: args.join(' '),
      command,
      resolvedCommand,
      workingDirectory,
    });
    const timeout = setTimeout(() => {
      if (settled) {
        return;
      }

      logger.warn('CLI timeout reached, terminating process', {
        command,
        timeoutMs,
        workingDirectory,
      });
      child.kill('SIGTERM');
      setTimeout(() => {
        if (!settled) {
          child.kill('SIGKILL');
        }
      }, 5_000).unref();
    }, timeoutMs);

    let stdout = '';
    let stderr = '';

    child.stdout.on('data', (chunk: Buffer) => {
      stdout += chunk.toString();
    });
    child.stderr.on('data', (chunk: Buffer) => {
      stderr += chunk.toString();
    });
    child.on('error', (error) => {
      settled = true;
      clearTimeout(timeout);
      logger.error('CLI spawn failed', {
        command,
        error: String(error),
        workingDirectory,
      });
      reject(new InfrastructureError(`Failed to spawn ${command}`, { cause: error }));
    });
    child.on('close', (exitCode) => {
      settled = true;
      clearTimeout(timeout);
      const durationMs = Date.now() - startedAt;
      logger.info('CLI finish', {
        command,
        durationMs,
        exitCode,
      });
      if (stdout.trim()) {
        logger.cli(`${command} stdout`, stdout);
      }
      if (stderr.trim()) {
        logger.cli(`${command} stderr`, stderr);
      }
      resolve({ exitCode, stderr, stdout });
    });

    if (stdin !== null) {
      child.stdin.write(stdin);
    }
    child.stdin.end();
  });
}

export async function withTempFile<T>(
  filename: string,
  action: (filePath: string) => Promise<T>,
): Promise<T> {
  const tempDir = await mkdtemp(join(tmpdir(), 'zhc-execution-'));
  const filePath = join(tempDir, filename);

  try {
    return await action(filePath);
  } finally {
    await rm(tempDir, { force: true, recursive: true });
  }
}

export async function writeTempFile(filePath: string, content: string): Promise<void> {
  await writeFile(filePath, content, 'utf-8');
}

export async function readTempFile(filePath: string): Promise<string> {
  try {
    return await readFile(filePath, 'utf-8');
  } catch {
    return '';
  }
}

export function assertSuccessfulRun(
  command: string,
  exitCode: number | null,
  stderr: string,
  stdout: string,
): void {
  if (exitCode === 0) {
    return;
  }

  throw new InfrastructureError(`${command} execution failed`, {
    details: {
      exitCode,
      stderr: stderr.trim(),
      stdout: stdout.trim(),
    },
  });
}
