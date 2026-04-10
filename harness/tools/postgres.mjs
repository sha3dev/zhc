#!/usr/bin/env node
import 'dotenv/config';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import pg from 'pg';

const { Client, Pool } = pg;
const startedAt = Date.now();

function parseArgs(argv) {
  const args = {
    file: null,
    input: {},
    params: [],
    script: null,
    sql: null,
    transaction: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    const next = argv[index + 1];

    if (arg === '--file') {
      args.file = next ?? null;
      index += 1;
    } else if (arg === '--input') {
      args.input = JSON.parse(next ?? '{}');
      index += 1;
    } else if (arg === '--params') {
      args.params = JSON.parse(next ?? '[]');
      index += 1;
    } else if (arg === '--script') {
      args.script = next ?? null;
      index += 1;
    } else if (arg === '--sql') {
      args.sql = next ?? null;
      index += 1;
    } else if (arg === '--transaction') {
      args.transaction = true;
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
    code: typeof error === 'object' && error !== null ? error.code : undefined,
    message: error instanceof Error ? error.message : String(error),
    name: error instanceof Error ? error.name : 'Error',
  };
}

function getConnectionString() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error('DATABASE_URL is required');
  }
  return connectionString;
}

async function resolveSql(args) {
  if (args.sql) {
    return args.sql;
  }
  if (args.file) {
    return await readFile(resolve(process.cwd(), args.file), 'utf-8');
  }
  throw new Error('Structured Postgres mode requires --sql <sql> or --file <path>');
}

async function runRaw(args) {
  const connectionString = getConnectionString();
  const module = await import(pathToFileURL(resolve(process.cwd(), args.script)).href);
  if (typeof module.default !== 'function') {
    throw new Error('Raw Postgres script must export a default async function');
  }

  const result = await module.default({
    Client,
    connectionString,
    input: args.input,
    Pool,
  });

  return {
    durationMs: Date.now() - startedAt,
    mode: 'raw',
    result,
    success: true,
  };
}

async function runStructured(args) {
  const connectionString = getConnectionString();
  const sql = await resolveSql(args);
  const client = new Client({ connectionString });

  await client.connect();
  try {
    if (args.transaction) {
      await client.query('BEGIN');
    }
    const result = await client.query(sql, args.params);
    if (args.transaction) {
      await client.query('COMMIT');
    }

    return {
      durationMs: Date.now() - startedAt,
      mode: 'structured',
      rowCount: result.rowCount,
      rows: result.rows,
      success: true,
    };
  } catch (error) {
    if (args.transaction) {
      await client.query('ROLLBACK').catch(() => undefined);
    }
    throw error;
  } finally {
    await client.end();
  }
}

async function main() {
  const args = parseArgs(process.argv.slice(2));

  if (args.help) {
    print({
      usage:
        'postgres.mjs --sql <sql> [--params <json-array>] [--transaction] OR --script <path> [--input <json>]',
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
