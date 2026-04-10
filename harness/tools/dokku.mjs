#!/usr/bin/env node
import 'dotenv/config';
import { spawn } from 'node:child_process';
import pg from 'pg';

const { Client } = pg;
const startedAt = Date.now();

function parseArgs(argv) {
  const args = {
    action: null,
    app: null,
    dokku: null,
    env: [],
    lines: 100,
    remote: null,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    const next = argv[index + 1];

    if (arg === '--action') {
      args.action = next ?? null;
      index += 1;
    } else if (arg === '--app') {
      args.app = next ?? null;
      index += 1;
    } else if (arg === '--dokku') {
      args.dokku = next ?? null;
      index += 1;
    } else if (arg === '--env') {
      args.env.push(next ?? '');
      index += 1;
    } else if (arg === '--lines') {
      args.lines = Number(next ?? args.lines);
      index += 1;
    } else if (arg === '--remote') {
      args.remote = next ?? null;
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
    code: typeof error === 'object' && error !== null ? error.code : undefined,
    message: error instanceof Error ? error.message : String(error),
    name: error instanceof Error ? error.name : 'Error',
  };
}

function requireValue(value, message) {
  if (!value) {
    throw new Error(message);
  }
  return value;
}

async function runLocal(command, args) {
  return await new Promise((resolve) => {
    const child = spawn(command, args, {
      cwd: process.cwd(),
      env: process.env,
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    let stdout = '';
    let stderr = '';

    child.stdout.on('data', (chunk) => {
      stdout += chunk.toString();
    });
    child.stderr.on('data', (chunk) => {
      stderr += chunk.toString();
    });
    child.on('close', (exitCode) => {
      resolve({ exitCode, stderr, stdout });
    });
  });
}

async function loadConfig() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error('DATABASE_URL is required to load Dokku Settings');
  }

  const client = new Client({ connectionString });
  await client.connect();
  try {
    const result = await client.query(
      'select cfg_dokku_host, cfg_dokku_port, cfg_dokku_ssh_user from configuration limit 1',
    );
    const row = result.rows[0];
    if (!row?.cfg_dokku_host) {
      throw new Error('Dokku host is not configured in Settings');
    }

    return {
      host: row.cfg_dokku_host,
      port: row.cfg_dokku_port ?? 22,
      sshUser: row.cfg_dokku_ssh_user ?? 'dokku',
    };
  } finally {
    await client.end();
  }
}

function sshArgs(config, dokkuCommand) {
  return [
    '-p',
    String(config.port),
    '-o',
    'BatchMode=yes',
    `${config.sshUser}@${config.host}`,
    `dokku ${dokkuCommand}`,
  ];
}

async function runDokku(config, dokkuCommand) {
  return await runLocal('ssh', sshArgs(config, dokkuCommand));
}

function commandForAction(args) {
  const app = args.app;

  if (args.action === 'status') return 'version';
  if (args.action === 'config:get') return null;
  if (args.action === 'apps:list') return 'apps:list';
  if (args.action === 'apps:exists') return `apps:exists ${requireValue(app, '--app is required')}`;
  if (args.action === 'logs') {
    return `logs ${requireValue(app, '--app is required')} --num ${args.lines}`;
  }
  if (args.action === 'config:list') {
    return `config:show ${requireValue(app, '--app is required')}`;
  }
  if (args.action === 'config:set') {
    if (args.env.length === 0) {
      throw new Error('config:set requires at least one --env KEY=value');
    }
    return `config:set ${requireValue(app, '--app is required')} ${args.env.join(' ')}`;
  }
  if (args.action === 'domains:list') {
    return `domains:report ${requireValue(app, '--app is required')}`;
  }
  if (args.action === 'ps:report') return `ps:report ${requireValue(app, '--app is required')}`;
  if (args.action === 'ps:restart') return `ps:restart ${requireValue(app, '--app is required')}`;

  throw new Error(`Unsupported Dokku action: ${args.action}`);
}

async function runDeploy(args) {
  requireValue(args.app, '--app is required');
  const remote = requireValue(args.remote, '--remote is required');
  return await runLocal('git', ['push', remote, 'HEAD:refs/heads/master']);
}

async function main() {
  const args = parseArgs(process.argv.slice(2));

  if (args.help) {
    print({
      usage:
        'dokku.mjs --action status|apps:list|logs|config:list|config:set|domains:list|ps:report|ps:restart|deploy:git OR --dokku <command>',
    });
  }

  const config = await loadConfig();
  const action = args.dokku ? 'raw' : args.action;
  if (!action) {
    throw new Error('Dokku mode requires --action <name> or --dokku <command>');
  }

  if (action === 'config:get') {
    print({
      action,
      durationMs: Date.now() - startedAt,
      host: {
        hostname: config.host,
        port: config.port,
        sshUser: config.sshUser,
      },
      success: true,
    });
  }

  const result =
    action === 'deploy:git'
      ? await runDeploy(args)
      : await runDokku(config, args.dokku ?? commandForAction(args));

  print(
    {
      action,
      durationMs: Date.now() - startedAt,
      exitCode: result.exitCode,
      host: {
        hostname: config.host,
        port: config.port,
        sshUser: config.sshUser,
      },
      stderr: result.stderr.trim(),
      stdout: result.stdout.trim(),
      success: result.exitCode === 0,
    },
    result.exitCode === 0 ? 0 : 1,
  );
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
