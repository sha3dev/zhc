import { exec, spawn } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { promisify } from 'node:util';
import { CLI_TOOLS } from '../domain/tool.js';
import type { CliStatus, CliTool, CliToolStatus } from '../domain/tool.js';

const execAsync = promisify(exec);

/** Env vars that disable interactive TUI behaviour in most CLIs */
const NONINTERACTIVE_ENV = {
  ...process.env,
  TERM: 'dumb',
  NO_COLOR: '1',
  FORCE_COLOR: '0',
  CI: '1',
};

const ESC = String.fromCharCode(27);

/**
 * Strip ANSI/VT100 escape sequences and non-printable control characters.
 * Uses charAt() to avoid noUncheckedIndexedAccess errors with str[i].
 */
function stripAnsi(str: string): string {
  let result = '';
  let i = 0;
  while (i < str.length) {
    const ch = str.charAt(i);
    if (ch === ESC && str.charAt(i + 1) === '[') {
      // CSI sequence: ESC [ <params> <final-byte A-Za-z>
      i += 2;
      while (i < str.length && !/[A-Za-z]/.test(str.charAt(i))) i++;
      i++;
    } else if (ch === ESC) {
      // Other ESC sequence: skip ESC + next char
      i += 2;
    } else {
      const code = str.charCodeAt(i);
      const isControl =
        code <= 8 || code === 11 || code === 12 || (code >= 14 && code <= 31) || code === 127;
      if (!isControl) result += ch;
      i++;
    }
  }
  return result;
}

/** A real model ID: starts with a letter/digit, contains only safe chars, min 3 chars */
function isModelName(s: string): boolean {
  return /^[a-zA-Z0-9][a-zA-Z0-9._\-/]*$/.test(s) && s.length >= 3;
}

async function detectVersion(command: string): Promise<string | null> {
  try {
    const { stdout, stderr } = await execAsync(`${command} --version`, {
      timeout: 3000,
      env: NONINTERACTIVE_ENV,
    });
    const raw = stripAnsi((stdout || stderr).trim());
    const match = raw.match(/\d+\.\d+[\d.]*/);
    return match ? match[0] : (raw.split('\n')[0] ?? raw);
  } catch {
    return null;
  }
}

/**
 * Checks authentication via a dedicated CLI auth command.
 * Exit code 0 = authenticated; optionally parses a JSON boolean field.
 */
async function checkAuth(tool: CliTool): Promise<boolean> {
  if (!tool.authCommand) return false;
  try {
    const { stdout } = await execAsync(tool.authCommand, {
      timeout: 5000,
      env: NONINTERACTIVE_ENV,
    });
    if (tool.authJsonField) {
      try {
        const parsed = JSON.parse(stripAnsi(stdout.trim())) as Record<string, unknown>;
        return parsed[tool.authJsonField] === true;
      } catch {
        return false;
      }
    }
    return true; // exit 0 is sufficient
  } catch {
    return false;
  }
}

/**
 * Reads the Claude Code OAuth access token from the macOS Keychain.
 * The token (sk-ant-oat01-…) works as an x-api-key against the Anthropic API.
 * Returns null on non-macOS platforms or when credentials are not found.
 */
async function readAnthropicToken(): Promise<string | null> {
  if (process.platform !== 'darwin') return null;
  try {
    const { stdout } = await execAsync(
      'security find-generic-password -s "Claude Code-credentials" -w',
      { timeout: 3000 },
    );
    const creds = JSON.parse(stdout.trim()) as {
      claudeAiOauth?: { accessToken?: string };
    };
    return creds.claudeAiOauth?.accessToken ?? null;
  } catch {
    return null;
  }
}

/**
 * Calls GET https://api.anthropic.com/v1/models using the Claude OAuth token as x-api-key.
 * Returns model IDs sorted as returned by the API.
 */
async function fetchAnthropicModels(token: string): Promise<string[]> {
  try {
    const res = await fetch('https://api.anthropic.com/v1/models?limit=100', {
      headers: {
        'x-api-key': token,
        'anthropic-version': '2023-06-01',
      },
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return [];
    const data = (await res.json()) as { data?: { id?: string }[] };
    return (data.data ?? []).map((m) => m.id ?? '').filter(isModelName);
  } catch {
    return [];
  }
}

/**
 * Reads ~/.codex/models_cache.json, a file maintained by the codex CLI itself.
 * Returns the list of model slugs; empty if file is absent or unparseable.
 */
async function readCodexModels(): Promise<string[]> {
  try {
    const cachePath = join(homedir(), '.codex', 'models_cache.json');
    const content = await readFile(cachePath, 'utf-8');
    const data = JSON.parse(content) as { models?: { slug?: string }[] };
    return (data.models ?? []).map((m) => m.slug ?? '').filter(isModelName);
  } catch {
    return [];
  }
}

interface GeminiSettingsFile {
  selectedAuthType?: string;
}

async function hasGeminiPersonalLogin(): Promise<boolean> {
  try {
    const settingsPath = join(homedir(), '.gemini', 'settings.json');
    const credsPath = join(homedir(), '.gemini', 'oauth_creds.json');

    const [settingsRaw, credsRaw] = await Promise.all([
      readFile(settingsPath, 'utf-8'),
      readFile(credsPath, 'utf-8'),
    ]);

    const settings = JSON.parse(settingsRaw) as GeminiSettingsFile;
    if (settings.selectedAuthType !== 'oauth-personal') {
      return false;
    }

    const creds = JSON.parse(credsRaw) as Record<string, unknown>;
    return Object.keys(creds).length > 0;
  } catch {
    return false;
  }
}

/**
 * Spawns the CLI's models command with stdin closed (prevents CPR/TUI hangs)
 * and a hard 5s SIGKILL timeout.
 *
 * { ran: true }  — exit code 0 (CLI is configured/authenticated)
 * { ran: false } — non-zero exit or timeout
 */
function fetchCliModels(modelsCommand: string): Promise<{ ran: boolean; models: string[] }> {
  return new Promise((resolve) => {
    const parts = modelsCommand.split(' ');
    const cmd = parts[0] ?? '';
    const args = parts.slice(1);

    const child = spawn(cmd, args, {
      // 'ignore' stdin → closes stdin fd immediately, preventing CPR response hangs
      stdio: ['ignore', 'pipe', 'pipe'],
      env: NONINTERACTIVE_ENV,
    });

    let stdout = '';
    child.stdout?.on('data', (chunk: Buffer) => {
      stdout += chunk.toString();
    });

    let settled = false;
    const finish = (exitCode: number | null) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);

      if (exitCode !== 0) {
        resolve({ ran: false, models: [] });
        return;
      }

      const raw = stripAnsi(stdout).trim();
      if (!raw) {
        resolve({ ran: true, models: [] });
        return;
      }

      // Try JSON shapes first
      try {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          const names = (parsed as unknown[])
            .map((m) =>
              typeof m === 'string'
                ? m
                : ((m as { id?: string; name?: string }).id ??
                  (m as { id?: string; name?: string }).name ??
                  ''),
            )
            .filter(isModelName);
          resolve({ ran: true, models: names });
          return;
        }
        const asObj = parsed as { data?: unknown[] };
        if (asObj.data && Array.isArray(asObj.data)) {
          const names = (asObj.data as { id?: string; name?: string }[])
            .map((m) => m.id ?? m.name ?? '')
            .filter(isModelName);
          resolve({ ran: true, models: names });
          return;
        }
      } catch {
        // not JSON — fall through
      }

      // Line-based fallback
      const lines = raw
        .split('\n')
        .map((l) => l.trim())
        .filter(isModelName);
      resolve({ ran: true, models: lines });
    };

    child.on('close', (code) => finish(code));
    child.on('error', () => finish(null));

    // Hard timeout — kill and resolve
    const timer = setTimeout(() => {
      child.kill('SIGKILL');
      finish(null);
    }, 5000);
  });
}

async function fetchToolStatus(tool: CliTool): Promise<CliToolStatus> {
  const version = await detectVersion(tool.command);

  if (!version) {
    return {
      id: tool.id,
      name: tool.name,
      command: tool.command,
      status: 'not_installed' as CliStatus,
      version: null,
      models: [],
    };
  }

  let authenticated: boolean;
  let models: string[];

  if (tool.id === 'claude_code') {
    // Auth via `claude auth status` JSON; models via Anthropic REST API + keychain token
    authenticated = await checkAuth(tool);
    if (authenticated) {
      const token = await readAnthropicToken();
      const fetched = token ? await fetchAnthropicModels(token) : [];
      models = fetched.length > 0 ? fetched : (tool.knownModels ?? []);
    } else {
      models = [];
    }
  } else if (tool.id === 'codex') {
    // Auth via `codex login status` exit code; models from ~/.codex/models_cache.json
    authenticated = await checkAuth(tool);
    if (authenticated) {
      const cached = await readCodexModels();
      models = cached.length > 0 ? cached : (tool.knownModels ?? []);
    } else {
      models = [];
    }
  } else if (tool.id === 'gemini_cli') {
    authenticated = await hasGeminiPersonalLogin();
    models = authenticated ? (tool.knownModels ?? []) : [];
  } else if (tool.modelsCommand) {
    // opencode (and any future tool): modelsCommand exit code doubles as auth signal
    const result = await fetchCliModels(tool.modelsCommand);
    authenticated = result.ran;
    models = result.models;
  } else {
    authenticated = false;
    models = [];
  }

  return {
    id: tool.id,
    name: tool.name,
    command: tool.command,
    status: (authenticated ? 'configured' : 'installed') as CliStatus,
    version,
    models,
  };
}

export class ToolsService {
  private cached: CliToolStatus[] | null = null;
  private cachedAt: Date | null = null;

  /** Returns cached data if available; fetches fresh data on first call. */
  async listStatus(): Promise<{ items: CliToolStatus[]; cachedAt: string | null }> {
    if (!this.cached) {
      this.cached = await Promise.all(CLI_TOOLS.map(fetchToolStatus));
      this.cachedAt = new Date();
    }
    return { items: this.cached, cachedAt: this.cachedAt?.toISOString() ?? null };
  }

  /** Clears the in-memory cache; the next listStatus() call will re-fetch. */
  invalidate(): void {
    this.cached = null;
    this.cachedAt = null;
  }
}
