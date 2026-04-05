/**
 * Dokku utilities
 *
 * Helper functions for Dokku integration
 */

import type { Configuration } from '../types/configuration.js';

/**
 * Generate Dokku git remote URL for a project
 *
 * @param projectSlug - The project slug (used as app name in Dokku)
 * @param systemConfig - System configuration with Dokku settings
 * @returns Git remote URL (e.g., "dokku@dokku.example.com:my-project")
 *
 * @example
 * ```ts
 * const url = getDokkuGitRemoteUrl('my-project', systemConfig);
 * // Returns: "dokku@dokku.example.com:my-project"
 * ```
 */
export function getDokkuGitRemoteUrl(
  projectSlug: string,
  systemConfig?: Pick<Configuration, 'dokku'>,
): string {
  if (!systemConfig?.dokku) {
    throw new Error('System Dokku configuration not found');
  }

  const { host, port, sshUser } = systemConfig.dokku;

  // Format: ssh_user@host:app_name
  // If port is not default 22, include it: ssh_user@host:port:app_name
  if (port && port !== 22) {
    return `${sshUser}@${host}:${port}:${projectSlug}`;
  }

  return `${sshUser}@${host}:${projectSlug}`;
}

/**
 * Generate Dokku app URL for a project
 *
 * @param projectSlug - The project slug (used as app name in Dokku)
 * @param systemConfig - System configuration with Dokku settings
 * @returns Dokku app URL (e.g., "http://dokku.example.com:8080/my-project")
 *
 * @example
 * ```ts
 * const url = getDokkuAppUrl('my-project', systemConfig);
 * // Returns: "http://dokku.example.com:8080/my-project"
 * ```
 */
export function getDokkuAppUrl(
  projectSlug: string,
  systemConfig?: Pick<Configuration, 'dokku'>,
): string {
  if (!systemConfig?.dokku) {
    throw new Error('System Dokku configuration not found');
  }

  const { host } = systemConfig.dokku;

  // Dokku typically exposes apps on port 80 or 8080
  // Format: http://host/app_name
  return `http://${host}/${projectSlug}`;
}

/**
 * Validate Dokku configuration
 *
 * @param systemConfig - System configuration to validate
 * @returns True if valid, throws error if invalid
 *
 * @example
 * ```ts
 * try {
 *   validateDokkuConfig(systemConfig);
 *   console.log('Dokku config is valid');
 * } catch (error) {
 *   console.error('Invalid Dokku config:', error.message);
 * }
 * ```
 */
export function validateDokkuConfig(systemConfig?: Pick<Configuration, 'dokku'>): boolean {
  if (!systemConfig?.dokku) {
    throw new Error('Dokku configuration is missing');
  }

  const { host, port, sshUser } = systemConfig.dokku;

  if (!host || host.trim() === '') {
    throw new Error('Dokku host is required');
  }

  if (port && (port < 1 || port > 65535)) {
    throw new Error('Dokku port must be between 1 and 65535');
  }

  if (!sshUser || sshUser.trim() === '') {
    throw new Error('Dokku SSH user is required');
  }

  return true;
}

/**
 * Get Dokku SSH command prefix for a project
 *
 * @param projectSlug - The project slug (used as app name in Dokku)
 * @param systemConfig - System configuration with Dokku settings
 * @returns SSH command prefix (e.g., "ssh dokku@dokku.example.com")
 *
 * @example
 * ```ts
 * const sshPrefix = getDokkuSshPrefix('my-project', systemConfig);
 * // Returns: "ssh dokku@dokku.example.com"
 *
 * // Use it to run Dokku commands:
 * const command = `${sshPrefix} logs my-project`;
 * ```
 */
export function getDokkuSshPrefix(
  _projectSlug: string,
  systemConfig?: Pick<Configuration, 'dokku'>,
): string {
  if (!systemConfig?.dokku) {
    throw new Error('System Dokku configuration not found');
  }

  const { host, port, sshUser } = systemConfig.dokku;

  // Format: ssh -p port user@host
  if (port && port !== 22) {
    return `ssh -p ${port} ${sshUser}@${host}`;
  }

  return `ssh ${sshUser}@${host}`;
}

/**
 * Extract project slug from Dokku git remote URL
 *
 * @param gitRemoteUrl - Git remote URL (e.g., "dokku@dokku.example.com:my-project")
 * @returns Project slug (e.g., "my-project")
 *
 * @example
 * ```ts
 * const slug = extractProjectSlugFromRemote('dokku@dokku.example.com:my-project');
 * // Returns: "my-project"
 * ```
 */
export function extractProjectSlugFromRemote(gitRemoteUrl: string): string {
  // Format: user@host:project or user@host:port:project
  const parts = gitRemoteUrl.split(':');

  if (parts.length === 2) {
    // user@host:project
    return parts[1]!;
  }
  if (parts.length === 3) {
    // user@host:port:project
    return parts[2]!;
  }

  throw new Error(`Invalid Dokku git remote URL format: ${gitRemoteUrl}`);
}
