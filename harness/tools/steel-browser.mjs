#!/usr/bin/env node
import 'dotenv/config';
import { mkdir } from 'node:fs/promises';
import pg from 'pg';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import playwright, { chromium, firefox, webkit } from 'playwright';
import Steel from 'steel-sdk';

const { Client } = pg;
const startedAt = Date.now();
const outputDir = resolve(process.cwd(), 'tmp/steel-browser');

function parseArgs(argv) {
  const args = {
    actions: null,
    blockAds: false,
    browser: 'chromium',
    headless: false,
    input: {},
    namespace: null,
    persistProfile: false,
    profileId: null,
    region: null,
    script: null,
    solveCaptcha: false,
    timeoutMs: 300000,
    useProxy: true,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    const next = argv[index + 1];

    if (arg === '--actions') {
      args.actions = JSON.parse(next ?? '[]');
      index += 1;
    } else if (arg === '--block-ads') {
      args.blockAds = true;
    } else if (arg === '--browser') {
      args.browser = next ?? args.browser;
      index += 1;
    } else if (arg === '--headless') {
      args.headless = true;
    } else if (arg === '--input') {
      args.input = JSON.parse(next ?? '{}');
      index += 1;
    } else if (arg === '--namespace') {
      args.namespace = next ?? null;
      index += 1;
    } else if (arg === '--persist-profile') {
      args.persistProfile = true;
    } else if (arg === '--profile-id') {
      args.profileId = next ?? null;
      index += 1;
    } else if (arg === '--region') {
      args.region = next ?? null;
      index += 1;
    } else if (arg === '--script') {
      args.script = next ?? null;
      index += 1;
    } else if (arg === '--solve-captcha') {
      args.solveCaptcha = true;
    } else if (arg === '--timeout-ms') {
      args.timeoutMs = Number(next ?? args.timeoutMs);
      index += 1;
    } else if (arg === '--use-proxy') {
      args.useProxy = true;
    } else if (arg === '--no-proxy') {
      args.useProxy = false;
    } else if (arg === '--help') {
      args.help = true;
    }
  }

  return args;
}

function print(value, exitCode = 0) {
  process.stdout.write(`${JSON.stringify(value, null, 2)}\n`);
  process.exit(exitCode);
}

function serializeError(error) {
  return {
    message: error instanceof Error ? error.message : String(error),
    name: error instanceof Error ? error.name : 'Error',
    stack: error instanceof Error ? error.stack : undefined,
  };
}

function sanitizeFilename(name) {
  return name.replace(/[^a-zA-Z0-9._-]/g, '-');
}

async function getConfiguredSteelApiKey() {
  if (process.env.STEEL_API_KEY?.trim()) {
    return process.env.STEEL_API_KEY.trim();
  }

  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error('DATABASE_URL is required to load Steel Settings');
  }

  const client = new Client({ connectionString });
  await client.connect();

  try {
    const result = await client.query('select cfg_steel_api_key from configuration limit 1');
    const apiKey = result.rows[0]?.cfg_steel_api_key?.trim();
    if (!apiKey) {
      throw new Error('Steel API key is not configured in Settings');
    }

    return apiKey;
  } finally {
    await client.end();
  }
}

function getBrowserType(name) {
  if (name === 'firefox') return firefox;
  if (name === 'webkit') return webkit;
  return chromium;
}

async function createSession(client, args) {
  return await client.sessions.create({
    blockAds: args.blockAds || undefined,
    headless: args.headless,
    namespace: args.namespace ?? undefined,
    persistProfile: args.persistProfile || undefined,
    profileId: args.profileId ?? undefined,
    region: args.region ?? undefined,
    solveCaptcha: args.solveCaptcha || undefined,
    timeout: Number.isFinite(args.timeoutMs) ? args.timeoutMs : undefined,
    useProxy: args.useProxy,
  });
}

async function connectSession(session) {
  return await getBrowserType('chromium').connectOverCDP(session.websocketUrl);
}

async function resolveSessionContext(browser) {
  const context = browser.contexts()[0];
  if (!context) {
    throw new Error('Steel session did not expose a browser context');
  }

  const page = context.pages()[0] ?? (await context.newPage());
  return { context, page };
}

async function runActions(page, actions) {
  const consoleMessages = [];
  const failedRequests = [];
  const artifacts = [];
  const results = [];

  page.on('console', (message) => {
    consoleMessages.push({
      location: message.location(),
      text: message.text(),
      type: message.type(),
    });
  });
  page.on('requestfailed', (request) => {
    failedRequests.push({
      failure: request.failure()?.errorText ?? null,
      method: request.method(),
      url: request.url(),
    });
  });

  for (const [index, action] of actions.entries()) {
    const type = action.type;
    let value = null;

    if (type === 'goto') {
      value = await page.goto(action.url, { waitUntil: action.waitUntil ?? 'load' });
      value = { status: value?.status() ?? null, url: page.url() };
    } else if (type === 'click') {
      await page.click(action.selector, action.options ?? {});
    } else if (type === 'fill') {
      await page.fill(action.selector, String(action.value ?? ''), action.options ?? {});
    } else if (type === 'type') {
      await page.type(action.selector, String(action.text ?? ''), action.options ?? {});
    } else if (type === 'press') {
      await page.press(action.selector ?? 'body', action.key, action.options ?? {});
    } else if (type === 'select') {
      value = await page.selectOption(action.selector, action.values ?? action.value);
    } else if (type === 'check') {
      await page.check(action.selector, action.options ?? {});
    } else if (type === 'uncheck') {
      await page.uncheck(action.selector, action.options ?? {});
    } else if (type === 'hover') {
      await page.hover(action.selector, action.options ?? {});
    } else if (type === 'drag') {
      await page.dragAndDrop(action.source, action.target, action.options ?? {});
    } else if (type === 'waitForText') {
      await page.getByText(action.text, action.options ?? {}).waitFor({
        timeout: action.timeoutMs,
      });
    } else if (type === 'waitForSelector') {
      await page.waitForSelector(action.selector, { timeout: action.timeoutMs });
    } else if (type === 'waitForURL') {
      await page.waitForURL(action.url, { timeout: action.timeoutMs });
    } else if (type === 'wait') {
      await page.waitForTimeout(action.ms ?? 1000);
    } else if (type === 'screenshot') {
      const path = resolve(outputDir, `${action.name ?? `screenshot-${index}`}.png`);
      await page.screenshot({ fullPage: action.fullPage ?? true, path });
      artifacts.push(path);
      value = { path };
    } else if (type === 'pdf') {
      const path = resolve(outputDir, `${action.name ?? `page-${index}`}.pdf`);
      await page.pdf({ path });
      artifacts.push(path);
      value = { path };
    } else if (type === 'download') {
      const downloadPromise = page.waitForEvent('download', {
        timeout: action.timeoutMs ?? 30_000,
      });
      if (action.selector) {
        await page.click(action.selector, action.options ?? {});
      } else if (action.url) {
        await page.goto(action.url, { waitUntil: action.waitUntil ?? 'networkidle' });
      } else {
        throw new Error('download action requires selector or url');
      }
      const download = await downloadPromise;
      const filename = sanitizeFilename(action.name ?? download.suggestedFilename());
      const path = resolve(outputDir, filename);
      await download.saveAs(path);
      artifacts.push(path);
      value = {
        path,
        suggestedFilename: download.suggestedFilename(),
        url: download.url(),
      };
    } else if (type === 'text') {
      value = await page
        .locator(action.selector ?? 'body')
        .innerText({ timeout: action.timeoutMs });
    } else if (type === 'html') {
      value = await page.locator(action.selector ?? 'html').innerHTML({
        timeout: action.timeoutMs,
      });
    } else if (type === 'evaluate') {
      const fn = Function(`return (${action.expression});`)();
      value = await page.evaluate(fn, action.arg);
    } else {
      throw new Error(`Unsupported Steel browser action: ${type}`);
    }

    results.push({ index, type, value });
  }

  return {
    artifacts,
    console: consoleMessages,
    failedRequests,
    finalUrl: page.url(),
    results,
    title: await page.title(),
  };
}

async function releaseSession(client, sessionId) {
  try {
    await client.sessions.release(sessionId);
  } catch {
    // Best effort: session timeout will eventually reclaim it.
  }
}

async function runRaw(args, client, session, browser, context, page) {
  if (!args.script) {
    throw new Error('Raw mode requires --script <path>');
  }

  const module = await import(pathToFileURL(resolve(process.cwd(), args.script)).href);
  if (typeof module.default !== 'function') {
    throw new Error('Raw Steel browser script must export a default async function');
  }

  const result = await module.default({
    browser,
    chromium,
    client,
    context,
    firefox,
    input: args.input,
    outputDir,
    page,
    playwright,
    session,
    webkit,
  });

  return {
    durationMs: Date.now() - startedAt,
    mode: 'raw',
    profileId: session.profileId ?? null,
    result,
    sessionId: session.id,
    sessionViewerUrl: session.sessionViewerUrl,
    success: true,
  };
}

async function runStructured(args, session, page) {
  const actions = Array.isArray(args.actions) ? args.actions : [];
  if (actions.length === 0) {
    throw new Error('Structured mode requires --actions <json-array>');
  }

  const report = await runActions(page, actions);

  return {
    ...report,
    durationMs: Date.now() - startedAt,
    mode: 'structured',
    profileId: session.profileId ?? null,
    sessionId: session.id,
    sessionViewerUrl: session.sessionViewerUrl,
    success: true,
  };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));

  if (args.help) {
    print({
      usage:
        'steel-browser.mjs --actions <json-array> [--profile-id id] [--persist-profile] [--namespace name] [--region fra] [--solve-captcha] [--no-proxy] [--timeout-ms 300000] OR --script <path> [--input <json>]',
    });
  }

  await mkdir(outputDir, { recursive: true });
  const apiKey = await getConfiguredSteelApiKey();
  const client = new Steel({ apiKey });
  const session = await createSession(client, args);
  let browser = null;

  try {
    browser = await connectSession(session);
    const { context, page } = await resolveSessionContext(browser);
    const report = args.script
      ? await runRaw(args, client, session, browser, context, page)
      : await runStructured(args, session, page);
    print(report);
  } finally {
    if (browser) {
      await browser.close();
    }
    await releaseSession(client, session.id);
  }
}

main().catch((error) => {
  print(
    {
      durationMs: Date.now() - startedAt,
      error: serializeError(error),
      success: false,
    },
    1,
  );
});
