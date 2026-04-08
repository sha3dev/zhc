/** A model available from an installed and configured CLI tool */
export interface Model {
  /** Stable selection value used by the UI, combining cliId + model name */
  value: string;
  name: string;
  displayName: string | null;
  /** CLI tool ID that provides this model (e.g. 'claude_code', 'codex', 'opencode') */
  cliId: string;
}
