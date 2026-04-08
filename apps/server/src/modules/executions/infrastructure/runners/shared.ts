import { spawn } from 'node:child_process';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { InfrastructureError } from '../../../../shared/errors/app-error.js';

const NONINTERACTIVE_ENV = {
  ...process.env,
  CI: '1',
  FORCE_COLOR: '0',
  NO_COLOR: '1',
  TERM: 'dumb',
};

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
): Promise<SpawnResult> {
  return await new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: workingDirectory,
      env: NONINTERACTIVE_ENV,
      stdio: ['pipe', 'pipe', 'pipe'],
    });

    let stdout = '';
    let stderr = '';

    child.stdout.on('data', (chunk: Buffer) => {
      stdout += chunk.toString();
    });
    child.stderr.on('data', (chunk: Buffer) => {
      stderr += chunk.toString();
    });
    child.on('error', (error) => {
      reject(new InfrastructureError(`Failed to spawn ${command}`, { cause: error }));
    });
    child.on('close', (exitCode) => {
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
