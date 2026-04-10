# Postgres Skill

Use this skill for database inspection, operational SQL, migration checks, data validation, or direct
Postgres client workflows. The wrapper uses `DATABASE_URL`.

You may use the complete `pg` client or pool API through raw mode.
If the model is strong enough, it may also bypass `harness:postgres` and use `psql`, `pg`, or a
direct database client with `DATABASE_URL`. The wrapper is recommended for structured output, but it
is not mandatory.

## Structured Mode

Run SQL directly:

```bash
npm run harness:postgres -- --sql "select 1 as ok"
```

Run SQL from a file:

```bash
npm run harness:postgres -- --file scripts/check.sql --params '["active"]'
```

Useful options:

- `--sql "<sql>"`: SQL text.
- `--file <path>`: SQL file path.
- `--params '[...]'`: JSON array of positional parameters.
- `--transaction`: wrap the statement in `BEGIN` / `COMMIT`.

The wrapper returns JSON with `success`, `rowCount`, `rows`, `durationMs`, and structured errors.
Connection strings and credentials are never printed.

## Raw Mode

Run:

```bash
npm run harness:postgres -- --script tmp/postgres/check.mjs --input '{"limit":5}'
```

Raw scripts must export a default async function:

```js
export default async function run({ Client, Pool, connectionString, input }) {
  const client = new Client({ connectionString });
  await client.connect();
  try {
    const result = await client.query('select $1::int as limit', [input.limit]);
    return { rows: result.rows };
  } finally {
    await client.end();
  }
}
```

Raw mode can use transactions, advisory locks, schema inspection, pools, custom result shaping, and
other `pg` APIs. Use transactions for multi-statement mutations. Avoid printing secrets or full row
dumps unless required by the task.
