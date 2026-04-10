#!/usr/bin/env node
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const startedAt = Date.now();

function parseArgs(argv) {
  const args = {
    body: null,
    headers: [],
    input: {},
    json: null,
    method: 'GET',
    script: null,
    timeoutMs: 15000,
    url: null,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    const next = argv[index + 1];

    if (arg === '--body') {
      args.body = next ?? '';
      index += 1;
    } else if (arg === '--header') {
      args.headers.push(next ?? '');
      index += 1;
    } else if (arg === '--input') {
      args.input = JSON.parse(next ?? '{}');
      index += 1;
    } else if (arg === '--json') {
      args.json = JSON.parse(next ?? 'null');
      index += 1;
    } else if (arg === '--method') {
      args.method = next ?? args.method;
      index += 1;
    } else if (arg === '--script') {
      args.script = next ?? null;
      index += 1;
    } else if (arg === '--timeout-ms') {
      args.timeoutMs = Number(next ?? args.timeoutMs);
      index += 1;
    } else if (arg === '--url') {
      args.url = next ?? null;
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

function parseHeaders(headerValues) {
  const headers = new Headers();
  for (const value of headerValues) {
    const separator = value.indexOf(':');
    if (separator <= 0) {
      throw new Error(`Invalid header: ${value}`);
    }
    headers.set(value.slice(0, separator).trim(), value.slice(separator + 1).trim());
  }
  return headers;
}

function headersToObject(headers) {
  const output = {};
  headers.forEach((value, key) => {
    output[key] = value;
  });
  return output;
}

async function readBody(response) {
  const text = await response.text();
  try {
    return { json: JSON.parse(text), textPreview: text.slice(0, 10000) };
  } catch {
    return { json: null, textPreview: text.slice(0, 10000) };
  }
}

async function runRaw(args) {
  const module = await import(pathToFileURL(resolve(process.cwd(), args.script)).href);
  if (typeof module.default !== 'function') {
    throw new Error('Raw HTTP script must export a default async function');
  }

  const result = await module.default({
    fetch,
    Headers,
    input: args.input,
    Request,
    Response,
  });

  return {
    durationMs: Date.now() - startedAt,
    mode: 'raw',
    result,
    success: true,
  };
}

async function runStructured(args) {
  if (!args.url) {
    throw new Error('Structured HTTP mode requires --url <url>');
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), args.timeoutMs);
  const headers = parseHeaders(args.headers);
  let body = args.body;

  if (args.json !== null) {
    body = JSON.stringify(args.json);
    if (!headers.has('content-type')) {
      headers.set('content-type', 'application/json');
    }
  }

  try {
    const response = await fetch(args.url, {
      body,
      headers,
      method: args.method,
      signal: controller.signal,
    });
    const parsedBody = await readBody(response);

    return {
      body: parsedBody,
      durationMs: Date.now() - startedAt,
      headers: headersToObject(response.headers),
      mode: 'structured',
      ok: response.ok,
      status: response.status,
      statusText: response.statusText,
      success: true,
      url: response.url,
    };
  } finally {
    clearTimeout(timeout);
  }
}

async function main() {
  const args = parseArgs(process.argv.slice(2));

  if (args.help) {
    print({
      usage:
        'http.mjs --method GET --url <url> [--header "Name: value"] [--json <json>] OR --script <path> [--input <json>]',
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
