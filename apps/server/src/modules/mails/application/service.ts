import { InfrastructureError, NotFoundError } from '../../../shared/errors/app-error.js';
import type { ConfigurationReader } from '../../configuration/index.js';
import type { EmailAddress, EmailDetails } from '../domain/email.js';
import type {
  EmailAgentLookup,
  EmailProvider,
  EmailProviderConfig,
  EmailsRepository,
  ListEmailsQuery,
  ReceivedEmailDetails,
  SendEmailInput,
  SyncInboundResult,
} from './contracts.js';

function parseAddress(value: string): EmailAddress {
  const trimmed = value.trim();
  const angleMatch = trimmed.match(/^(.*)<([^>]+)>$/);

  if (!angleMatch) {
    return {
      address: trimmed.toLowerCase(),
      name: null,
    };
  }

  const name = angleMatch[1]?.trim().replace(/^"|"$/g, '') || null;
  const address = angleMatch[2]?.trim().toLowerCase() ?? trimmed.toLowerCase();
  return { address, name };
}

function parseAddressList(values: string[] | null | undefined): EmailAddress[] | null {
  if (!values) {
    return null;
  }

  return values.map(parseAddress);
}

function parseReferences(value: string | null | undefined): string[] | null {
  if (!value) {
    return null;
  }

  const parts = value
    .split(/\s+/)
    .map((item) => item.trim())
    .filter(Boolean);

  return parts.length > 0 ? parts : null;
}

export class EmailsService {
  constructor(
    private readonly repository: EmailsRepository,
    private readonly provider: EmailProvider,
    private readonly configuration: ConfigurationReader,
    private readonly agents: EmailAgentLookup,
  ) {}

  async getById(id: number): Promise<EmailDetails> {
    const email = await this.repository.findById(id);

    if (!email) {
      throw new NotFoundError(`Email ${id} not found`);
    }

    return email;
  }

  list(query: ListEmailsQuery) {
    return this.repository.list(query);
  }

  async send(input: SendEmailInput): Promise<EmailDetails> {
    const config = await this.getProviderConfig();

    try {
      const result = await this.provider.sendEmail(config, input);
      return this.repository.create({
        agentId: input.agentId,
        bccAddresses: parseAddressList(input.bcc) ?? null,
        ccAddresses: parseAddressList(input.cc) ?? null,
        direction: 'outbound',
        fromAddress: config.fromAddress,
        fromName: config.fromName,
        htmlBody: input.html ?? null,
        inReplyToHeader: null,
        messageIdHeader: null,
        provider: config.provider,
        providerCreatedAt: null,
        providerMessageId: result.providerMessageId,
        rawPayload: { request: result.request },
        references: null,
        status: 'sent',
        subject: input.subject,
        textBody: input.text ?? null,
        toAddresses: input.to.map(parseAddress),
      });
    } catch (error) {
      throw new InfrastructureError('Failed to send email', { cause: error });
    }
  }

  async syncInbound(): Promise<SyncInboundResult> {
    const config = await this.tryGetProviderConfig();

    if (!config) {
      return { imported: 0, skipped: 0 };
    }

    const items = await this.provider.listReceivedEmails(config, { limit: 100 });
    let imported = 0;
    let skipped = 0;

    for (const item of items) {
      const existing =
        (await this.repository.findByProviderMessageId(item.id)) ??
        (await this.repository.findByProviderMessageId(item.messageId));

      if (existing) {
        skipped += 1;
        continue;
      }

      const details = await this.provider.getReceivedEmail(config, item.id);
      await this.persistInboundEmail(config, details);
      imported += 1;
    }

    return { imported, skipped };
  }

  private async getProviderConfig(): Promise<EmailProviderConfig> {
    const config = await this.configuration.getInternal();
    const resendApiKey = config.email.resendApiKey.value?.trim() ?? '';
    const fromAddress = config.email.fromAddress?.trim() ?? '';
    const inboundAddress = config.email.inboundAddress?.trim() ?? '';

    if (!resendApiKey || !fromAddress || !inboundAddress) {
      throw new InfrastructureError('Email configuration is incomplete');
    }

    return {
      fromAddress,
      fromName: config.email.fromName,
      inboundAddress,
      provider: 'resend',
      resendApiKey,
    };
  }

  private async persistInboundEmail(
    config: EmailProviderConfig,
    email: ReceivedEmailDetails,
  ): Promise<void> {
    const ceo = await this.agents.getCeo();
    const headers = email.headers ?? null;

    await this.repository.create({
      agentId: ceo?.id ?? null,
      bccAddresses: parseAddressList(email.bcc),
      ccAddresses: parseAddressList(email.cc),
      direction: 'inbound',
      fromAddress: parseAddress(email.from).address,
      fromName: parseAddress(email.from).name,
      htmlBody: email.html,
      inReplyToHeader: headers?.['in-reply-to'] ?? null,
      messageIdHeader: headers?.['message-id'] ?? email.messageId,
      provider: config.provider,
      providerCreatedAt: new Date(email.createdAt),
      providerMessageId: email.id,
      rawPayload: {
        ...email,
        headers,
      },
      references: parseReferences(headers?.['references']),
      status: 'received',
      subject: email.subject,
      textBody: email.text,
      toAddresses: (parseAddressList(email.to) ?? []) as EmailAddress[],
    });
  }

  private async tryGetProviderConfig(): Promise<EmailProviderConfig | null> {
    const config = await this.configuration.getInternal();

    if (!config.email.pollEnabled) {
      return null;
    }

    const resendApiKey = config.email.resendApiKey.value?.trim() ?? '';
    const fromAddress = config.email.fromAddress?.trim() ?? '';
    const inboundAddress = config.email.inboundAddress?.trim() ?? '';

    if (!resendApiKey || !fromAddress || !inboundAddress) {
      return null;
    }

    return {
      fromAddress,
      fromName: config.email.fromName,
      inboundAddress,
      provider: 'resend',
      resendApiKey,
    };
  }
}
