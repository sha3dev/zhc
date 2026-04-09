import { z } from 'zod';

export const emailDirectionSchema = z.enum(['inbound', 'outbound']);
export type EmailDirection = z.infer<typeof emailDirectionSchema>;

export const emailStatusSchema = z.enum(['received', 'sent', 'failed']);
export type EmailStatus = z.infer<typeof emailStatusSchema>;

export interface EmailAddress {
  address: string;
  name: string | null;
}

export interface EmailSummary {
  agentId: number | null;
  agentName: string | null;
  createdAt: Date;
  direction: EmailDirection;
  fromAddress: string | null;
  fromName: string | null;
  id: number;
  provider: string;
  providerCreatedAt: Date | null;
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

export interface EmailRecord {
  agn_id: number | null;
  agent_name: string | null;
  eml_bcc_addresses: EmailAddress[] | null;
  eml_cc_addresses: EmailAddress[] | null;
  eml_created_at: Date;
  eml_direction: EmailDirection;
  eml_error_message: string | null;
  eml_from_address: string | null;
  eml_from_name: string | null;
  eml_html_body: string | null;
  eml_id: number;
  eml_in_reply_to_header: string | null;
  eml_message_id_header: string | null;
  eml_provider: string;
  eml_provider_created_at: Date | null;
  eml_provider_message_id: string;
  eml_raw_payload: Record<string, unknown> | null;
  eml_references: string[] | null;
  eml_status: EmailStatus;
  eml_subject: string | null;
  eml_text_body: string | null;
  eml_to_addresses: EmailAddress[];
}

export interface PersistEmailInput {
  agentId: number | null;
  bccAddresses: EmailAddress[] | null;
  ccAddresses: EmailAddress[] | null;
  direction: EmailDirection;
  errorMessage?: string | null;
  fromAddress: string | null;
  fromName: string | null;
  htmlBody: string | null;
  inReplyToHeader: string | null;
  messageIdHeader: string | null;
  provider: string;
  providerCreatedAt: Date | null;
  providerMessageId: string;
  rawPayload: Record<string, unknown> | null;
  references: string[] | null;
  status: EmailStatus;
  subject: string | null;
  textBody: string | null;
  toAddresses: EmailAddress[];
}

export interface ListEmailsResult {
  emails: EmailSummary[];
  total: number;
}

export function toEmailSummary(record: EmailRecord): EmailSummary {
  return {
    agentId: record.agn_id,
    agentName: record.agent_name,
    createdAt: record.eml_created_at,
    direction: record.eml_direction,
    fromAddress: record.eml_from_address,
    fromName: record.eml_from_name,
    id: record.eml_id,
    provider: record.eml_provider,
    providerCreatedAt: record.eml_provider_created_at,
    providerMessageId: record.eml_provider_message_id,
    status: record.eml_status,
    subject: record.eml_subject,
    toAddresses: record.eml_to_addresses,
  };
}

export function toEmailDetails(record: EmailRecord): EmailDetails {
  return {
    ...toEmailSummary(record),
    bccAddresses: record.eml_bcc_addresses,
    ccAddresses: record.eml_cc_addresses,
    errorMessage: record.eml_error_message,
    htmlBody: record.eml_html_body,
    inReplyToHeader: record.eml_in_reply_to_header,
    messageIdHeader: record.eml_message_id_header,
    rawPayload: record.eml_raw_payload,
    references: record.eml_references,
    textBody: record.eml_text_body,
  };
}
