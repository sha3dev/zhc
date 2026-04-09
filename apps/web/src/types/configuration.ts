export interface SecretFieldState {
  configured: boolean;
}

export interface ConfigurationResponse {
  dokku: {
    host: string | null;
    port: number | null;
    sshUser: string | null;
  };
  email: {
    fromAddress: string | null;
    fromName: string | null;
    inboundAddress: string | null;
    pollEnabled: boolean;
    pollIntervalSeconds: number;
    resendApiKey: SecretFieldState;
  };
  github: {
    appId: string | null;
    clientId: string | null;
    clientSecret: SecretFieldState;
    installationId: string | null;
    privateKey: SecretFieldState;
  };
}

export interface UpdateConfigurationInput {
  dokku?: {
    host?: string | null;
    port?: number | null;
    sshUser?: string | null;
  };
  email?: {
    fromAddress?: string | null;
    fromName?: string | null;
    inboundAddress?: string | null;
    pollEnabled?: boolean;
    pollIntervalSeconds?: number;
    resendApiKey?: string;
  };
  github?: {
    appId?: string | null;
    clientId?: string | null;
    clientSecret?: string;
    installationId?: string | null;
    privateKey?: string | null;
  };
}
