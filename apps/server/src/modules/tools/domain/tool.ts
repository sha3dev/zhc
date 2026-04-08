export type CliStatus = 'not_installed' | 'installed' | 'configured';

export interface CliTool {
  id: string;
  name: string;
  command: string;
  /**
   * Command to check authentication status; exit code 0 = authenticated.
   * If not set, modelsCommand exit code is used as the auth proxy (legacy).
   */
  authCommand?: string;
  /**
   * If set, parse JSON from authCommand stdout and require this boolean field === true.
   * Only used when authCommand is set.
   */
  authJsonField?: string;
  /**
   * Command to list available models.
   * If null, knownModels is returned when authenticated.
   */
  modelsCommand: string | null;
  /**
   * Static list of model IDs returned when authenticated and modelsCommand is null.
   */
  knownModels?: string[];
}

export interface CliToolStatus {
  id: string;
  name: string;
  command: string;
  status: CliStatus;
  version: string | null;
  /** Model names — from CLI output or static list, empty if not configured */
  models: string[];
}

export const CLI_TOOLS: CliTool[] = [
  {
    id: 'claude_code',
    name: 'Claude Code',
    command: 'claude',
    // `claude models` is NOT a subcommand — it runs an agent session with "models" as prompt
    authCommand: 'claude auth status',
    authJsonField: 'loggedIn',
    modelsCommand: null,
    knownModels: ['claude-opus-4-6', 'claude-sonnet-4-6', 'claude-haiku-4-5-20251001'],
  },
  {
    id: 'codex',
    name: 'Codex',
    command: 'codex',
    // `codex models` subcommand does not exist — exits 1 with "Device not configured"
    authCommand: 'codex login status',
    modelsCommand: null,
    knownModels: ['gpt-4o', 'gpt-4o-mini', 'o3', 'o4-mini', 'gpt-5.4'],
  },
  {
    id: 'opencode',
    name: 'OpenCode',
    command: 'opencode',
    // opencode has built-in models — works without credentials; modelsCommand doubles as auth
    modelsCommand: 'opencode models',
  },
  {
    id: 'gemini_cli',
    name: 'Gemini CLI',
    command: 'gemini',
    modelsCommand: null,
    knownModels: ['gemini-2.5-pro', 'gemini-2.5-flash', 'gemini-2.5-flash-lite'],
  },
];
