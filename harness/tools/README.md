# Harness Tools

These wrappers are designed for model execution. They return JSON and support a structured mode for
common workflows plus a raw mode for direct client/API access.

## Browser

```bash
npm run harness:browser -- --actions '[{"type":"goto","url":"data:text/html,<h1>Hello</h1>"},{"type":"text","selector":"body"}]'
npm run harness:browser -- --script tmp/browser/check.mjs --input '{"url":"http://localhost:5173"}'
```

Install browsers when needed:

```bash
npm run harness:browser:install
```

## HTTP

```bash
npm run harness:http -- --method GET --url http://localhost:3000/api/health
npm run harness:http -- --script tmp/http/flow.mjs --input '{"baseUrl":"http://localhost:3000"}'
```

## Postgres

```bash
npm run harness:postgres -- --sql "select 1 as ok"
npm run harness:postgres -- --script tmp/postgres/check.mjs --input '{"limit":5}'
```

Requires `DATABASE_URL`.

## Email

```bash
npm run harness:email -- --action status
npm run harness:email -- --action config:get
npm run harness:email -- --action send --to '["user@example.com"]' --subject "Hello" --text "Body"
npm run harness:email -- --action inbox:list --limit 20
npm run harness:email -- --action local:list --direction inbound --limit 20
npm run harness:email -- --script tmp/email/flow.mjs --input '{"limit":5}'
```

Requires `DATABASE_URL` and Resend email Settings configured in the app.

## Dokku

```bash
npm run harness:dokku -- --action status
npm run harness:dokku -- --action config:get
npm run harness:dokku -- --action logs --app my-app --lines 100
npm run harness:dokku -- --dokku "apps:list"
```

Requires `DATABASE_URL` and Dokku Settings configured in the app.
