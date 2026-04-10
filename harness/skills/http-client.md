# HTTP Client Skill

Use this skill for API smoke tests, local service checks, webhook simulation, auth flows, polling, or
debugging HTTP responses.

If the model is strong enough, it may also bypass `harness:http` and use direct `fetch`, `curl`, or
another native HTTP client. The wrapper is recommended for stable JSON output, but it is not
mandatory.

## Structured Mode

Run:

```bash
npm run harness:http -- --method GET --url http://localhost:3000/api/health
npm run harness:http -- --method POST --url http://localhost:3000/api/items --json '{"name":"demo"}'
```

Useful options:

- `--method GET|POST|PUT|PATCH|DELETE`
- `--url <url>`
- `--header "Name: value"` repeated as needed
- `--json '<json>'`
- `--body '<text>'`
- `--timeout-ms 15000`

The wrapper returns JSON with `success`, `status`, `ok`, `headers`, parsed JSON when possible, text
preview, timing, and structured errors.

## Raw Mode

Run:

```bash
npm run harness:http -- --script tmp/http/flow.mjs --input '{"baseUrl":"http://localhost:3000"}'
```

Raw scripts must export a default async function:

```js
export default async function run({ fetch, Headers, Request, Response, input }) {
  const response = await fetch(`${input.baseUrl}/api/health`);
  return { status: response.status, body: await response.text() };
}
```

Raw mode can implement multi-request flows, retries, polling, auth handshakes, cookie/header
handling, and custom assertions. Do not print tokens, cookies, or secrets unless explicitly required.
