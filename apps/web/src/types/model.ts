export interface Model {
  value: string;
  name: string;
  displayName: string | null;
  /** CLI tool ID that provides this model (e.g. 'claude_code', 'codex', 'opencode') */
  cliId: string;
}

export interface ListModelsResponse {
  items: Model[];
  total: number;
}
