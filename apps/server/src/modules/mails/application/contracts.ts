import type {
  CreateEmailOptions,
  GetReceivingEmailResponseSuccess,
  ListReceivingEmail,
} from 'resend';
import { z } from 'zod';
import type { EmailDetails, EmailSummary, PersistEmailInput } from '../domain/email.js';
import { emailDirectionSchema, emailStatusSchema } from '../domain/email.js';

export const listEmailsQuerySchema = z.object({
  agentId: z.coerce.number().int().positive().optional(),
  direction: emailDirectionSchema.optional(),
  limit: z.coerce.number().int().positive().max(100).default(20),
  offset: z.coerce.number().int().min(0).default(0),
  search: z.string().trim().max(255).optional(),
  status: emailStatusSchema.optional(),
});

export type ListEmailsQuery = z.infer<typeof listEmailsQuerySchema>;

export interface SendEmailInput {
  agentId: number | null;
  bcc?: string[];
  cc?: string[];
  html?: string;
  replyTo?: string[];
  subject: string;
  tags?: { name: string; value: string }[];
  text?: string;
  to: string[];
}

export interface SyncInboundResult {
  imported: number;
  skipped: number;
}

export interface EmailsRepository {
  create(input: PersistEmailInput): Promise<EmailDetails>;
  findById(id: number): Promise<EmailDetails | null>;
  findByProviderMessageId(providerMessageId: string): Promise<EmailDetails | null>;
  list(query: ListEmailsQuery): Promise<{ emails: EmailSummary[]; total: number }>;
}

export interface EmailAgentLookup {
  getCeo(): Promise<{ id: number } | null>;
}

export interface EmailProviderConfig {
  fromAddress: string;
  fromName: string | null;
  inboundAddress: string;
  provider: 'resend';
  resendApiKey: string;
}

export interface ReceivedEmailSummary {
  bcc: string[] | null;
  cc: string[] | null;
  createdAt: string;
  from: string;
  id: string;
  messageId: string;
  subject: string;
  to: string[];
}

export interface ReceivedEmailDetails extends ReceivedEmailSummary {
  headers: Record<string, string> | null;
  html: string | null;
  raw: {
    downloadUrl: string;
    expiresAt: string;
  } | null;
  replyTo: string[] | null;
  text: string | null;
}

export interface EmailProvider {
  listReceivedEmails(
    config: EmailProviderConfig,
    options?: { limit?: number },
  ): Promise<ReceivedEmailSummary[]>;
  getReceivedEmail(config: EmailProviderConfig, id: string): Promise<ReceivedEmailDetails>;
  sendEmail(
    config: EmailProviderConfig,
    input: SendEmailInput,
  ): Promise<{ providerMessageId: string; request: CreateEmailOptions }>;
}

export function mapResendListEmail(email: ListReceivingEmail): ReceivedEmailSummary {
  return {
    bcc: email.bcc,
    cc: email.cc,
    createdAt: email.created_at,
    from: email.from,
    id: email.id,
    messageId: email.message_id,
    subject: email.subject,
    to: email.to,
  };
}

export function mapResendReceivingEmail(
  email: GetReceivingEmailResponseSuccess,
): ReceivedEmailDetails {
  return {
    bcc: email.bcc,
    cc: email.cc,
    createdAt: email.created_at,
    from: email.from,
    headers: email.headers,
    html: email.html,
    id: email.id,
    messageId: email.message_id,
    raw: email.raw
      ? {
          downloadUrl: email.raw.download_url,
          expiresAt: email.raw.expires_at,
        }
      : null,
    replyTo: email.reply_to,
    subject: email.subject,
    text: email.text,
    to: email.to,
  };
}

export function buildSendPayload(
  config: EmailProviderConfig,
  input: SendEmailInput,
): CreateEmailOptions {
  return {
    bcc: input.bcc,
    cc: input.cc,
    from: config.fromName ? `${config.fromName} <${config.fromAddress}>` : config.fromAddress,
    html: input.html,
    replyTo: input.replyTo,
    subject: input.subject,
    tags: input.tags,
    text: input.text,
    to: input.to,
  } as CreateEmailOptions;
}
