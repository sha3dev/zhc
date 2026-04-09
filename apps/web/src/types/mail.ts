export type EmailDirection = 'inbound' | 'outbound';
export type EmailStatus = 'received' | 'sent' | 'failed';

export interface EmailAddress {
  address: string;
  name: string | null;
}

export interface EmailSummary {
  agentId: number | null;
  agentName: string | null;
  createdAt: string;
  direction: EmailDirection;
  fromAddress: string | null;
  fromName: string | null;
  id: number;
  provider: string;
  providerCreatedAt: string | null;
  providerMessageId: string;
  status: EmailStatus;
  subject: string | null;
  toAddresses: EmailAddress[];
}

export interface EmailDetails extends EmailSummary {
  bccAddresses: EmailAddress[] | null;
  ccAddresses: EmailAddress[] | null;
  errorMessage: string | null;
  htmlBody: string | null;
  inReplyToHeader: string | null;
  messageIdHeader: string | null;
  rawPayload: Record<string, unknown> | null;
  references: string[] | null;
  textBody: string | null;
}

export interface ListEmailsResponse {
  items: EmailSummary[];
  limit: number;
  offset: number;
  total: number;
}

export interface SyncEmailsResponse {
  imported: number;
  skipped: number;
}
