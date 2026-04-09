export { listEmailsQuerySchema } from './application/contracts.js';
export type {
  EmailAgentLookup,
  EmailProvider,
  EmailProviderConfig,
  EmailsRepository,
  ListEmailsQuery,
  ReceivedEmailDetails,
  ReceivedEmailSummary,
  SendEmailInput,
  SyncInboundResult,
} from './application/contracts.js';
export { EmailsService } from './application/service.js';
export { EmailPoller } from './application/poller.js';
export type {
  EmailAddress,
  EmailDetails,
  EmailDirection,
  EmailStatus,
  EmailSummary,
} from './domain/email.js';
export { emailDirectionSchema, emailStatusSchema } from './domain/email.js';
export { ResendEmailProvider } from './infrastructure/resend-email-provider.js';
export { SqlEmailsRepository } from './infrastructure/sql-emails.repository.js';
export { createMailsRouter } from './presentation/http.js';
