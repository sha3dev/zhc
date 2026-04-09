import { Resend } from 'resend';
import { InfrastructureError } from '../../../shared/errors/app-error.js';
import {
  type EmailProvider,
  type EmailProviderConfig,
  type ReceivedEmailDetails,
  type ReceivedEmailSummary,
  type SendEmailInput,
  buildSendPayload,
  mapResendListEmail,
  mapResendReceivingEmail,
} from '../application/contracts.js';

export class ResendEmailProvider implements EmailProvider {
  async getReceivedEmail(config: EmailProviderConfig, id: string): Promise<ReceivedEmailDetails> {
    const client = new Resend(config.resendApiKey);
    const response = await client.emails.receiving.get(id);

    if (response.error || !response.data) {
      throw new InfrastructureError(`Resend failed to retrieve received email ${id}`, {
        details: response.error,
      });
    }

    return mapResendReceivingEmail(response.data);
  }

  async listReceivedEmails(
    config: EmailProviderConfig,
    options: { limit?: number } = {},
  ): Promise<ReceivedEmailSummary[]> {
    const client = new Resend(config.resendApiKey);
    const response = await client.emails.receiving.list({ limit: options.limit ?? 100 });

    if (response.error || !response.data) {
      throw new InfrastructureError('Resend failed to list received emails', {
        details: response.error,
      });
    }

    return response.data.data.map(mapResendListEmail);
  }

  async sendEmail(
    config: EmailProviderConfig,
    input: SendEmailInput,
  ): Promise<{ providerMessageId: string; request: ReturnType<typeof buildSendPayload> }> {
    const client = new Resend(config.resendApiKey);
    const payload = buildSendPayload(config, input);
    const response = await client.emails.send(payload);

    if (response.error || !response.data) {
      throw new InfrastructureError('Resend failed to send email', { details: response.error });
    }

    return {
      providerMessageId: response.data.id,
      request: payload,
    };
  }
}
