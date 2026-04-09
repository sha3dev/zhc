import { describe, expect, it, vi } from 'vitest';
import type { ConfigurationReader } from '../../../src/modules/configuration/application/contracts.js';
import type { InternalConfiguration } from '../../../src/modules/configuration/domain/configuration.js';
import type {
  EmailAgentLookup,
  EmailProvider,
  EmailsRepository,
  ReceivedEmailDetails,
  ReceivedEmailSummary,
} from '../../../src/modules/mails/application/contracts.js';
import { EmailsService } from '../../../src/modules/mails/application/service.js';
import type { EmailDetails, EmailSummary } from '../../../src/modules/mails/domain/email.js';

function createInternalConfiguration(
  overrides?: Partial<InternalConfiguration['email']>,
): InternalConfiguration {
  return {
    dokku: {
      host: null,
      port: null,
      sshUser: null,
    },
    email: {
      fromAddress: 'ceo@example.com',
      fromName: 'CEO',
      inboundAddress: 'inbound@example.com',
      pollEnabled: true,
      pollIntervalSeconds: 60,
      provider: 'resend',
      resendApiKey: { value: 're_test' },
      ...overrides,
    },
    github: {
      appId: null,
      clientId: null,
      clientSecret: { value: null },
      installationId: null,
      privateKey: { value: null },
    },
    id: 1,
  };
}

function createConfigurationReader(config: InternalConfiguration): ConfigurationReader {
  return {
    get: vi.fn(),
    getInternal: vi.fn().mockResolvedValue(config),
    update: vi.fn(),
  };
}

function createSummary(): ReceivedEmailSummary {
  return {
    bcc: null,
    cc: null,
    createdAt: '2026-04-09T10:00:00.000Z',
    from: 'Human <human@example.com>',
    id: 'rcv_123',
    messageId: '<message-id@example.com>',
    subject: 'Ping',
    to: ['CEO <ceo@example.com>'],
  };
}

function createDetails(): ReceivedEmailDetails {
  return {
    ...createSummary(),
    headers: {
      'in-reply-to': '<older@example.com>',
      references: '<one@example.com> <two@example.com>',
    },
    html: '<p>Ping</p>',
    raw: null,
    replyTo: null,
    text: 'Ping',
  };
}

function createRepository(existing: EmailDetails | null = null): EmailsRepository {
  return {
    create: vi.fn().mockImplementation(async (input) => ({
      agentId: input.agentId,
      agentName: 'CEO',
      bccAddresses: input.bccAddresses,
      ccAddresses: input.ccAddresses,
      createdAt: new Date().toISOString(),
      direction: input.direction,
      errorMessage: input.errorMessage ?? null,
      fromAddress: input.fromAddress,
      fromName: input.fromName,
      htmlBody: input.htmlBody,
      id: 1,
      inReplyToHeader: input.inReplyToHeader,
      messageIdHeader: input.messageIdHeader,
      provider: input.provider,
      providerCreatedAt: input.providerCreatedAt?.toISOString() ?? null,
      providerMessageId: input.providerMessageId,
      rawPayload: input.rawPayload,
      references: input.references,
      status: input.status,
      subject: input.subject,
      textBody: input.textBody,
      toAddresses: input.toAddresses,
    })),
    findById: vi.fn(),
    findByProviderMessageId: vi.fn().mockResolvedValue(existing),
    list: vi.fn().mockResolvedValue({ emails: [] as EmailSummary[], total: 0 }),
  };
}

function createProvider(): EmailProvider {
  return {
    getReceivedEmail: vi.fn().mockResolvedValue(createDetails()),
    listReceivedEmails: vi.fn().mockResolvedValue([createSummary()]),
    sendEmail: vi.fn(),
  };
}

function createAgents(): EmailAgentLookup {
  return {
    getCeo: vi.fn().mockResolvedValue({ id: 7 }),
  };
}

describe('EmailsService', () => {
  it('imports new inbound emails and assigns them to the CEO', async () => {
    const repository = createRepository();
    const provider = createProvider();
    const service = new EmailsService(
      repository,
      provider,
      createConfigurationReader(createInternalConfiguration()),
      createAgents(),
    );

    const result = await service.syncInbound();

    expect(result).toEqual({ imported: 1, skipped: 0 });
    expect(provider.listReceivedEmails).toHaveBeenCalled();
    expect(provider.getReceivedEmail).toHaveBeenCalledWith(
      expect.objectContaining({ provider: 'resend' }),
      'rcv_123',
    );
    expect(repository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        agentId: 7,
        direction: 'inbound',
        providerMessageId: 'rcv_123',
        status: 'received',
      }),
    );
  });

  it('skips already-imported provider message ids', async () => {
    const repository = createRepository({
      agentId: 7,
      agentName: 'CEO',
      bccAddresses: null,
      ccAddresses: null,
      createdAt: new Date().toISOString(),
      direction: 'inbound',
      errorMessage: null,
      fromAddress: 'human@example.com',
      fromName: 'Human',
      htmlBody: '<p>Ping</p>',
      id: 1,
      inReplyToHeader: null,
      messageIdHeader: '<message-id@example.com>',
      provider: 'resend',
      providerCreatedAt: new Date().toISOString(),
      providerMessageId: 'rcv_123',
      rawPayload: null,
      references: null,
      status: 'received',
      subject: 'Ping',
      textBody: 'Ping',
      toAddresses: [{ address: 'ceo@example.com', name: 'CEO' }],
    });
    const provider = createProvider();
    const service = new EmailsService(
      repository,
      provider,
      createConfigurationReader(createInternalConfiguration()),
      createAgents(),
    );

    const result = await service.syncInbound();

    expect(result).toEqual({ imported: 0, skipped: 1 });
    expect(provider.getReceivedEmail).not.toHaveBeenCalled();
    expect(repository.create).not.toHaveBeenCalled();
  });
});
