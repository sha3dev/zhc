# Steel Browser Skill

Use this skill when the task needs a real cloud browser session with persistent profiles, remote
session viewer URLs, credential-safe login flows, screenshots, downloads, or browsing on external
sites such as Google, X.com, SaaS dashboards, and other internet properties.

This wrapper uses the Steel API key from Settings and starts a remote browser session through Steel.
Artifacts are written under `<working_directory>/tmp/steel-browser/`.

Prefer this skill over `playwright-browser` when:
- the task is browsing the public internet
- a persistent profile matters
- the CEO may want a live/session viewer link
- screenshots or downloaded files should survive a remote browser session cleanly

## Structured Mode

Run:

```bash
npm run harness:steel-browser -- --actions '[{"type":"goto","url":"https://www.google.com/search?q=crossfit+design+references"},{"type":"screenshot","name":"google-results","fullPage":true}]' --persist-profile --namespace product-designer
```

Supported actions:

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
- `download`: `{ "type": "download", "selector": "a[download]", "name": "artifact.zip" }`
- `text`: `{ "type": "text", "selector": "body" }`
- `html`: `{ "type": "html", "selector": "main" }`
- `evaluate`: `{ "type": "evaluate", "expression": "() => document.title" }`

Useful flags:

- `--profile-id <id>`: reuse an existing Steel profile
- `--persist-profile`: persist cookies/auth/browser state back into the profile
- `--namespace <name>`: isolate credentials/profiles by namespace
- `--region <fra|lax|ord|iad|scl|nrt>`: choose browser region
- `--solve-captcha`: enable automatic captcha solving
- `--no-proxy`: disable Steel proxies for the session
- `--headless`: run headless instead of headful

The wrapper returns JSON with:
- `success`
- `sessionId`
- `sessionViewerUrl`
- `profileId`
- `results`
- `artifacts`
- `console`
- `failedRequests`
- `finalUrl`
- `title`

## Raw Mode

Run:

```bash
npm run harness:steel-browser -- --script tmp/steel-browser/check.mjs --input '{"url":"https://x.com"}' --persist-profile --namespace research
```

Raw scripts must export a default async function:

```js
export default async function run({ client, session, browser, context, page, outputDir, input }) {
  await page.goto(input.url);
  const title = await page.title();
  return {
    profileId: session.profileId ?? null,
    sessionViewerUrl: session.sessionViewerUrl,
    title,
  };
}
```

Raw mode is the right choice for:
- multi-page or multi-tab flows
- login flows with reused profiles or credentials
- scraping/searching references on Google or X.com
- downloading files to the workspace
- attaching screenshots and evidence back into the task thread
