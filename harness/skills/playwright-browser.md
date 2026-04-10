# Playwright Browser Skill

Use this skill for browser navigation, UI verification, screenshots, console inspection, network
inspection, accessibility checks, file uploads/downloads, tracing, mobile emulation, or any workflow
that needs a real browser.

You may use the complete Playwright API through raw mode.
If the model is strong enough, it may also use Playwright directly without going through
`harness:browser`. The wrapper is recommended because it gives stable JSON output and standard
artifact handling, but it is not mandatory.

## Structured Mode

Run:

```bash
npm run harness:browser -- --actions '[{"type":"goto","url":"http://localhost:5173"},{"type":"screenshot","name":"home"}]'
```

Structured actions are JSON objects. Supported actions:

- `goto`: `{ "type": "goto", "url": "https://example.com", "waitUntil": "load" }`
- `click`: `{ "type": "click", "selector": "button[type=submit]" }`
- `fill`: `{ "type": "fill", "selector": "#email", "value": "user@example.com" }`
- `type`: `{ "type": "type", "selector": "#search", "text": "query" }`
- `press`: `{ "type": "press", "selector": "body", "key": "Enter" }`
- `select`: `{ "type": "select", "selector": "select", "values": ["a"] }`
- `check` / `uncheck`: `{ "type": "check", "selector": "#terms" }`
- `hover`: `{ "type": "hover", "selector": ".menu" }`
- `drag`: `{ "type": "drag", "source": "#a", "target": "#b" }`
- `waitForText`: `{ "type": "waitForText", "text": "Saved" }`
- `waitForSelector`: `{ "type": "waitForSelector", "selector": ".ready" }`
- `waitForURL`: `{ "type": "waitForURL", "url": "**/dashboard" }`
- `wait`: `{ "type": "wait", "ms": 500 }`
- `screenshot`: `{ "type": "screenshot", "name": "state", "fullPage": true }`
- `pdf`: `{ "type": "pdf", "name": "page" }`
- `text`: `{ "type": "text", "selector": "body" }`
- `html`: `{ "type": "html", "selector": "main" }`
- `evaluate`: `{ "type": "evaluate", "expression": "() => document.title" }`

The wrapper returns JSON with `success`, `results`, `finalUrl`, `title`, `console`, `failedRequests`,
`artifacts`, and `error` when relevant. Temporary browser artifacts are written under
`<working_directory>/tmp/browser/`.

## Raw Mode

Run:

```bash
npm run harness:browser -- --script tmp/browser/check.mjs --input '{"url":"http://localhost:5173"}'
```

Raw scripts must export a default async function:

```js
export default async function run({ playwright, chromium, firefox, webkit, outputDir, input }) {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  await page.goto(input.url);
  const title = await page.title();
  await browser.close();
  return { title };
}
```

Raw mode can use browser contexts, routes, request interception, frames, downloads, uploads, storage
state, tracing, video, accessibility snapshots, mobile emulation, custom assertions, and every other
Playwright API.
