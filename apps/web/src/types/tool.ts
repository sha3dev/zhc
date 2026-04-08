export type CliStatus = 'not_installed' | 'installed' | 'configured';

export interface CliToolStatus {
  id: string;
  name: string;
  command: string;
  status: CliStatus;
  version: string | null;
  models: string[];
}

export interface CliToolsResponse {
  items: CliToolStatus[];
  /** ISO-8601 timestamp of the last cache fill; null if never fetched */
  cachedAt: string | null;
}
