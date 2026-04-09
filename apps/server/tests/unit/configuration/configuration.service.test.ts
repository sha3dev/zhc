import { describe, expect, it, vi } from 'vitest';
import type {
  ConfigurationRepository,
  UpdateConfigurationInput,
} from '../../../src/modules/configuration/application/contracts.js';
import { ConfigurationService } from '../../../src/modules/configuration/application/service.js';
import type { InternalConfiguration } from '../../../src/modules/configuration/domain/configuration.js';

function createInternalConfiguration(): InternalConfiguration {
  return {
    dokku: {
      host: 'dokku.example.com',
      port: 22,
      sshUser: 'dokku',
    },
    email: {
      fromAddress: 'ceo@example.com',
      fromName: 'CEO',
      inboundAddress: 'inbound@example.com',
      pollEnabled: true,
      pollIntervalSeconds: 60,
      provider: 'resend',
      resendApiKey: { value: 're_secret' },
    },
    github: {
      appId: '123',
      clientId: 'Iv1.123',
      clientSecret: { value: 'secret' },
      installationId: '456',
      privateKey: { value: 'pem' },
    },
    id: 1,
  };
}

function createRepository(configuration = createInternalConfiguration()): ConfigurationRepository {
  return {
    get: vi.fn().mockResolvedValue(configuration),
    update: vi.fn().mockImplementation(async (_input: UpdateConfigurationInput) => configuration),
  };
}

describe('ConfigurationService', () => {
  it('returns a public configuration with secrets redacted', async () => {
    const repository = createRepository();
    const service = new ConfigurationService(repository);

    const result = await service.get();

    expect(result.github.clientSecret).toEqual({ configured: true });
    expect(result.github.privateKey).toEqual({ configured: true });
    expect(result.email.resendApiKey).toEqual({ configured: true });
  });

  it('preserves internal configuration access for background services', async () => {
    const configuration = createInternalConfiguration();
    const repository = createRepository(configuration);
    const service = new ConfigurationService(repository);

    const result = await service.getInternal();

    expect(result.email.resendApiKey.value).toBe('re_secret');
    expect(result.github.clientSecret.value).toBe('secret');
  });
});
