#!/usr/bin/env node
import { mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import playwright, { chromium, firefox, webkit } from 'playwright';

const startedAt = Date.now();
const outputDir = resolve(process.cwd(), 'tmp/browser');

function parseArgs(argv) {
  const args = { actions: null, browser: 'chromium', headless: true, input: {}, script: null };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    const next = argv[index + 1];

    if (arg === '--actions') {
      args.actions = JSON.parse(next ?? '[]');
      index += 1;
    } else if (arg === '--browser') {
      args.browser = next ?? args.browser;
      index += 1;
    } else if (arg === '--headed') {
      args.headless = false;
    } else if (arg === '--input') {
      args.input = JSON.parse(next ?? '{}');
      index += 1;
    } else if (arg === '--script') {
      args.script = next ?? null;
      index += 1;
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

function getBrowserType(name) {
  if (name === 'firefox') return firefox;
  if (name === 'webkit') return webkit;
  return chromium;
}

async function runRaw(args) {
  if (!args.script) {
    throw new Error('Raw mode requires --script <path>');
  }

  await mkdir(outputDir, { recursive: true });
  const module = await import(pathToFileURL(resolve(process.cwd(), args.script)).href);
  if (typeof module.default !== 'function') {
    throw new Error('Raw browser script must export a default async function');
  }

  const result = await module.default({
    chromium,
    firefox,
    input: args.input,
    outputDir,
    playwright,
    webkit,
  });

  return {
    durationMs: Date.now() - startedAt,
    mode: 'raw',
    result,
    success: true,
  };
}

async function runStructured(args) {
  const actions = Array.isArray(args.actions) ? args.actions : [];
  if (actions.length === 0) {
    throw new Error('Structured mode requires --actions <json-array>');
  }

  await mkdir(outputDir, { recursive: true });

  const consoleMessages = [];
  const failedRequests = [];
  const artifacts = [];
  const results = [];
  const browser = await getBrowserType(args.browser).launch({ headless: args.headless });
  const page = await browser.newPage();

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

  try {
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
        throw new Error(`Unsupported browser action: ${type}`);
      }

      results.push({ index, type, value });
    }

    return {
      artifacts,
      console: consoleMessages,
      durationMs: Date.now() - startedAt,
      failedRequests,
      finalUrl: page.url(),
      mode: 'structured',
      results,
      success: true,
      title: await page.title(),
    };
  } finally {
    await browser.close();
  }
}

async function main() {
  const args = parseArgs(process.argv.slice(2));

  if (args.help) {
    print({
      usage:
        'browser.mjs --actions <json-array> [--browser chromium|firefox|webkit] [--headed] OR --script <path> [--input <json>]',
    });
  }

  const report = args.script ? await runRaw(args) : await runStructured(args);
  print(report);
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
