export interface SecretFieldState {
  configured: boolean;
}

export interface ConfigurationSecretInput {
  value?: string;
}

export interface DokkuConfiguration {
  host: string | null;
  port: number | null;
  sshUser: string | null;
}

export interface GithubConfiguration {
  appId: string | null;
  clientId: string | null;
  clientSecret: SecretFieldState;
  installationId: string | null;
  privateKey: SecretFieldState;
}

export type EmailProvider = 'resend';

export interface EmailConfiguration {
  fromAddress: string | null;
  fromName: string | null;
  inboundAddress: string | null;
  pollEnabled: boolean;
  pollIntervalSeconds: number;
  resendApiKey: SecretFieldState;
}

export interface Configuration {
  dokku: DokkuConfiguration;
  email: EmailConfiguration;
  github: GithubConfiguration;
}

export interface InternalConfigurationSecret {
  value: string | null;
}

export interface InternalGithubConfiguration {
  appId: string | null;
  clientId: string | null;
  clientSecret: InternalConfigurationSecret;
  installationId: string | null;
  privateKey: InternalConfigurationSecret;
}

export interface InternalEmailConfiguration {
  fromAddress: string | null;
  fromName: string | null;
  inboundAddress: string | null;
  pollEnabled: boolean;
  pollIntervalSeconds: number;
  provider: EmailProvider;
  resendApiKey: InternalConfigurationSecret;
}

export interface InternalConfiguration {
  dokku: DokkuConfiguration;
  email: InternalEmailConfiguration;
  github: InternalGithubConfiguration;
  id: number;
}

export interface ConfigurationRecord {
  cfg_dokku_host: string | null;
  cfg_dokku_port: number | null;
  cfg_dokku_ssh_user: string | null;
  cfg_email_from_address: string | null;
  cfg_email_from_name: string | null;
  cfg_email_inbound_address: string | null;
  cfg_email_poll_enabled: boolean;
  cfg_email_poll_interval_seconds: number;
  cfg_email_provider: EmailProvider | null;
  cfg_github_app_id: string | null;
  cfg_github_client_id: string | null;
  cfg_github_client_secret: string | null;
  cfg_github_installation_id: string | null;
  cfg_github_private_key: string | null;
  cfg_id: number;
  cfg_resend_api_key: string | null;
}

export function toInternalConfiguration(record: ConfigurationRecord): InternalConfiguration {
  return {
    dokku: {
      host: record.cfg_dokku_host,
      port: record.cfg_dokku_port,
      sshUser: record.cfg_dokku_ssh_user,
    },
    email: {
      fromAddress: record.cfg_email_from_address,
      fromName: record.cfg_email_from_name,
      inboundAddress: record.cfg_email_inbound_address,
      pollEnabled: record.cfg_email_poll_enabled,
      pollIntervalSeconds: record.cfg_email_poll_interval_seconds,
      provider: record.cfg_email_provider ?? 'resend',
      resendApiKey: {
        value: record.cfg_resend_api_key,
      },
    },
    github: {
      appId: record.cfg_github_app_id,
      clientId: record.cfg_github_client_id,
      clientSecret: {
        value: record.cfg_github_client_secret,
      },
      installationId: record.cfg_github_installation_id,
      privateKey: {
        value: record.cfg_github_private_key,
      },
    },
    id: record.cfg_id,
  };
}

export function toConfiguration(config: InternalConfiguration): Configuration {
  return {
    dokku: config.dokku,
    email: {
      fromAddress: config.email.fromAddress,
      fromName: config.email.fromName,
      inboundAddress: config.email.inboundAddress,
      pollEnabled: config.email.pollEnabled,
      pollIntervalSeconds: config.email.pollIntervalSeconds,
      resendApiKey: {
        configured: Boolean(config.email.resendApiKey.value),
      },
    },
    github: {
      appId: config.github.appId,
      clientId: config.github.clientId,
      clientSecret: {
        configured: Boolean(config.github.clientSecret.value),
      },
      installationId: config.github.installationId,
      privateKey: {
        configured: Boolean(config.github.privateKey.value),
      },
    },
  };
}
