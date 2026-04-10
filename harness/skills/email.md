# Email Skill

Use this skill to send outbound email, read inbound mailbox messages, sync inbound messages into
the platform email log, or inspect local email history. The wrapper reads Resend configuration from
Settings through `DATABASE_URL`.

Prefer structured mode for normal mail operations. Use raw mode when a task needs direct Resend API
access or a custom multi-step mail workflow.

## Structured Mode

Check configuration:

```bash
npm run harness:email -- --action status
npm run harness:email -- --action config:get
```

Send email:

```bash
npm run harness:email -- --action send --to '["user@example.com"]' --subject "Hello" --text "Body"
```

Read inbound mail from Resend:

```bash
npm run harness:email -- --action inbox:list --limit 20
npm run harness:email -- --action inbox:get --id <resend-received-email-id>
```

Read local mail log:

```bash
npm run harness:email -- --action local:list --direction inbound --limit 20
npm run harness:email -- --action local:get --id 123
```

Sync inbound mail from Resend into the local email log:

```bash
npm run harness:email -- --action sync-inbound --limit 100
```

Supported send options:

- `--to '["a@example.com"]'`
- `--cc '["c@example.com"]'`
- `--bcc '["b@example.com"]'`
- `--reply-to '["reply@example.com"]'`
- `--subject "Subject"`
- `--text "Plain body"`
- `--html "<p>HTML body</p>"`

## Raw Mode

Run:

```bash
npm run harness:email -- --script tmp/email/check.mjs --input '{"limit":5}'
```

Raw scripts must export a default async function:

```js
export default async function run({ Resend, Client, Pool, config, input }) {
  const resend = new Resend(config.resendApiKey);
  const emails = await resend.emails.receiving.list({ limit: input.limit ?? 5 });
  return emails;
}
```

Raw mode can use the complete Resend client and `pg` client/pool API. You may also bypass this
wrapper and call Resend or the local database directly if the model has the capability and the task
requires it. Use `config:get` first when you need the configured sender, inbound address, or Resend
API key for direct provider usage.

## Safety Rules

- Do not send email unless the task explicitly requires outbound communication.
- Always include recipients, subject, and a concise send result in your report.
- Do not print API keys, full headers with secrets, cookies, tokens, or private message content
  beyond what the task requires.
- Prefer `local:list`/`local:get` for already-synced mail history and `inbox:list`/`inbox:get` when
  you need the provider mailbox directly.
- Use `sync-inbound` before reasoning over new inbound mail if the local log may be stale.
