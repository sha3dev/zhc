import { access, constants } from 'node:fs/promises';
import { homedir } from 'node:os';
import { delimiter, isAbsolute, join } from 'node:path';

const cache = new Map<string, string | null>();

const FALLBACK_PATHS: Record<string, string[]> = {
  claude: [join(homedir(), '.nvm/versions/node/v20.11.1/bin/claude')],
  codex: [join(homedir(), '.nvm/versions/node/v20.11.1/bin/codex')],
  gemini: [join(homedir(), '.nvm/versions/node/v20.11.1/bin/gemini')],
  kilo: [join(homedir(), '.nvm/versions/node/v20.11.1/bin/kilo')],
  opencode: [join(homedir(), '.opencode/bin/opencode')],
};

async function isExecutable(path: string): Promise<boolean> {
  try {
    await access(path, constants.X_OK);
    return true;
  } catch {
    return false;
  }
}

export function invalidateCliResolutionCache(): void {
  cache.clear();
}

export async function resolveCliCommand(command: string): Promise<string | null> {
  if (cache.has(command)) {
    return cache.get(command) ?? null;
  }

  const candidates = new Set<string>();

  if (isAbsolute(command)) {
    candidates.add(command);
  } else {
    for (const entry of (process.env.PATH ?? '').split(delimiter).filter(Boolean)) {
      candidates.add(join(entry, command));
    }

    for (const entry of FALLBACK_PATHS[command] ?? []) {
      candidates.add(entry);
    }
  }

  for (const candidate of candidates) {
    if (await isExecutable(candidate)) {
      cache.set(command, candidate);
      return candidate;
    }
  }

  cache.set(command, null);
  return null;
}
