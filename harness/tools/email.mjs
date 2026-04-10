#!/usr/bin/env node
import 'dotenv/config';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import pg from 'pg';
import { Resend } from 'resend';

const { Client, Pool } = pg;
const startedAt = Date.now();

function parseArgs(argv) {
  const args = {
    action: null,
    bcc: [],
    cc: [],
    direction: null,
    html: null,
    id: null,
    input: {},
    limit: 20,
    offset: 0,
    replyTo: [],
    script: null,
    search: null,
    subject: null,
    text: null,
    to: [],
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    const next = argv[index + 1];

    if (arg === '--action') {
      args.action = next ?? null;
      index += 1;
    } else if (arg === '--bcc') {
      args.bcc = parseAddressArg(next);
      index += 1;
    } else if (arg === '--cc') {
      args.cc = parseAddressArg(next);
      index += 1;
    } else if (arg === '--direction') {
      args.direction = next ?? null;
      index += 1;
    } else if (arg === '--html') {
      args.html = next ?? null;
      index += 1;
    } else if (arg === '--id') {
      args.id = next ?? null;
      index += 1;
    } else if (arg === '--input') {
      args.input = JSON.parse(next ?? '{}');
      index += 1;
    } else if (arg === '--limit') {
      args.limit = Number(next ?? args.limit);
      index += 1;
    } else if (arg === '--offset') {
      args.offset = Number(next ?? args.offset);
      index += 1;
    } else if (arg === '--reply-to') {
      args.replyTo = parseAddressArg(next);
      index += 1;
    } else if (arg === '--script') {
      args.script = next ?? null;
      index += 1;
    } else if (arg === '--search') {
      args.search = next ?? null;
      index += 1;
    } else if (arg === '--subject') {
      args.subject = next ?? null;
      index += 1;
    } else if (arg === '--text') {
      args.text = next ?? null;
      index += 1;
    } else if (arg === '--to') {
      args.to = parseAddressArg(next);
      index += 1;
    } else if (arg === '--help') {
      args.help = true;
    }
  }

  return args;
}

function parseAddressArg(value) {
  if (!value) return [];
  const trimmed = value.trim();
  if (trimmed.startsWith('[')) {
    return JSON.parse(trimmed);
  }
  return trimmed
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
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
    throw new Error('DATABASE_URL is required to load email Settings');
  }
  return connectionString;
}

function parseAddress(value) {
  const trimmed = value.trim();
  const match = trimmed.match(/^(.*)<([^>]+)>$/);
  if (!match) {
    return { address: trimmed.toLowerCase(), name: null };
  }
  return {
    address: (match[2]?.trim() ?? trimmed).toLowerCase(),
    name: match[1]?.trim().replace(/^"|"$/g, '') || null,
  };
}

function parseAddressList(values) {
  if (!values || values.length === 0) return null;
  return values.map(parseAddress);
}

function configFromRow(row) {
  if (!row?.cfg_resend_api_key) {
    throw new Error('Resend API key is not configured in Settings');
  }

  return {
    fromAddress: row.cfg_email_from_address ?? null,
    fromName: row.cfg_email_from_name ?? null,
    inboundAddress: row.cfg_email_inbound_address ?? null,
    pollEnabled: row.cfg_email_poll_enabled ?? false,
    resendApiKey: row.cfg_resend_api_key,
  };
}

async function withClient(action) {
  const client = new Client({ connectionString: getConnectionString() });
  await client.connect();
  try {
    return await action(client);
  } finally {
    await client.end();
  }
}

async function loadConfig() {
  return await withClient(async (client) => {
    const result = await client.query(`
      select cfg_resend_api_key,
             cfg_email_from_name,
             cfg_email_from_address,
             cfg_email_inbound_address,
             cfg_email_poll_enabled
      from configuration
      limit 1
    `);
    return configFromRow(result.rows[0]);
  });
}

function buildSendPayload(config, args) {
  if (!config.fromAddress) {
    throw new Error('Email from address is not configured in Settings');
  }
  if (args.to.length === 0) {
    throw new Error('send requires --to');
  }
  if (!args.subject) {
    throw new Error('send requires --subject');
  }
  if (!args.text && !args.html) {
    throw new Error('send requires --text or --html');
  }

  return {
    bcc: args.bcc.length > 0 ? args.bcc : undefined,
    cc: args.cc.length > 0 ? args.cc : undefined,
    from: config.fromName ? `${config.fromName} <${config.fromAddress}>` : config.fromAddress,
    html: args.html ?? undefined,
    replyTo: args.replyTo.length > 0 ? args.replyTo : undefined,
    subject: args.subject,
    text: args.text ?? undefined,
    to: args.to,
  };
}

async function persistOutbound(client, config, payload, providerMessageId) {
  await client.query(
    `
      insert into email (
        eml_provider, eml_provider_message_id, eml_direction, agn_id, eml_subject,
        eml_message_id_header, eml_in_reply_to_header, eml_references, eml_from_address,
        eml_from_name, eml_to_addresses, eml_cc_addresses, eml_bcc_addresses, eml_text_body,
        eml_html_body, eml_raw_payload, eml_status, eml_error_message, eml_provider_created_at
      ) values (
        'resend', $1, 'outbound', null, $2, null, null, null::jsonb, $3, $4, $5::jsonb,
        $6::jsonb, $7::jsonb, $8, $9, $10::jsonb, 'sent', null, null
      )
      on conflict (eml_provider_message_id) do nothing
    `,
    [
      providerMessageId,
      payload.subject,
      config.fromAddress,
      config.fromName,
      JSON.stringify(parseAddressList(payload.to) ?? []),
      JSON.stringify(parseAddressList(payload.cc) ?? null),
      JSON.stringify(parseAddressList(payload.bcc) ?? null),
      payload.text ?? null,
      payload.html ?? null,
      JSON.stringify({ request: { ...payload, from: '[configured sender]' } }),
    ],
  );
}

async function persistInbound(client, email) {
  await client.query(
    `
      insert into email (
        eml_provider, eml_provider_message_id, eml_direction, agn_id, eml_subject,
        eml_message_id_header, eml_in_reply_to_header, eml_references, eml_from_address,
        eml_from_name, eml_to_addresses, eml_cc_addresses, eml_bcc_addresses, eml_text_body,
        eml_html_body, eml_raw_payload, eml_status, eml_error_message, eml_provider_created_at
      ) values (
        'resend', $1, 'inbound', null, $2, $3, $4, $5::jsonb, $6, $7, $8::jsonb,
        $9::jsonb, $10::jsonb, $11, $12, $13::jsonb, 'received', null, $14
      )
      on conflict (eml_provider_message_id) do nothing
    `,
    [
      email.id,
      email.subject,
      email.headers?.['message-id'] ?? email.message_id ?? null,
      email.headers?.['in-reply-to'] ?? null,
      JSON.stringify(email.headers?.references?.split(/\s+/).filter(Boolean) ?? null),
      parseAddress(email.from).address,
      parseAddress(email.from).name,
      JSON.stringify(parseAddressList(email.to) ?? []),
      JSON.stringify(parseAddressList(email.cc) ?? null),
      JSON.stringify(parseAddressList(email.bcc) ?? null),
      email.text ?? null,
      email.html ?? null,
      JSON.stringify(email),
      email.created_at ? new Date(email.created_at) : null,
    ],
  );
}

async function sendEmail(args) {
  const config = await loadConfig();
  const resend = new Resend(config.resendApiKey);
  const payload = buildSendPayload(config, args);
  const response = await resend.emails.send(payload);

  if (response.error || !response.data) {
    throw new Error(`Resend failed to send email: ${JSON.stringify(response.error)}`);
  }

  await withClient(async (client) => {
    await persistOutbound(client, config, payload, response.data.id);
  });

  return {
    mode: 'structured',
    providerMessageId: response.data.id,
    subject: payload.subject,
    success: true,
    to: payload.to,
  };
}

async function listInbox(args) {
  const config = await loadConfig();
  const resend = new Resend(config.resendApiKey);
  const response = await resend.emails.receiving.list({ limit: args.limit });

  if (response.error || !response.data) {
    throw new Error(`Resend failed to list received emails: ${JSON.stringify(response.error)}`);
  }

  return {
    emails: response.data.data,
    mode: 'structured',
    success: true,
    total: response.data.data.length,
  };
}

async function getInbox(args) {
  if (!args.id) {
    throw new Error('inbox:get requires --id');
  }

  const config = await loadConfig();
  const resend = new Resend(config.resendApiKey);
  const response = await resend.emails.receiving.get(args.id);

  if (response.error || !response.data) {
    throw new Error(`Resend failed to retrieve received email: ${JSON.stringify(response.error)}`);
  }

  return {
    email: response.data,
    mode: 'structured',
    success: true,
  };
}

async function syncInbound(args) {
  const config = await loadConfig();
  const resend = new Resend(config.resendApiKey);
  const response = await resend.emails.receiving.list({ limit: args.limit });

  if (response.error || !response.data) {
    throw new Error(`Resend failed to list received emails: ${JSON.stringify(response.error)}`);
  }

  let imported = 0;
  let skipped = 0;

  await withClient(async (client) => {
    for (const item of response.data.data) {
      const existing = await client.query(
        'select eml_id from email where eml_provider_message_id = $1',
        [item.id],
      );
      if (existing.rows.length > 0) {
        skipped += 1;
        continue;
      }

      const details = await resend.emails.receiving.get(item.id);
      if (details.error || !details.data) {
        skipped += 1;
        continue;
      }
      await persistInbound(client, details.data);
      imported += 1;
    }
  });

  return {
    imported,
    mode: 'structured',
    skipped,
    success: true,
  };
}

async function listLocal(args) {
  return await withClient(async (client) => {
    const clauses = [];
    const params = [];
    let index = 1;

    if (args.direction) {
      clauses.push(`eml_direction = $${index++}`);
      params.push(args.direction);
    }
    if (args.search) {
      clauses.push(
        `(eml_subject ilike $${index} or eml_from_address ilike $${index} or eml_text_body ilike $${index})`,
      );
      params.push(`%${args.search}%`);
      index += 1;
    }

    const where = clauses.length > 0 ? `where ${clauses.join(' and ')}` : '';
    const result = await client.query(
      `
        select eml_id, eml_provider_message_id, eml_direction, eml_subject, eml_from_address,
               eml_from_name, eml_to_addresses, eml_status, eml_provider_created_at, eml_created_at
        from email
        ${where}
        order by coalesce(eml_provider_created_at, eml_created_at) desc, eml_id desc
        limit $${index++}
        offset $${index++}
      `,
      [...params, args.limit, args.offset],
    );

    return {
      emails: result.rows,
      mode: 'structured',
      success: true,
    };
  });
}

async function getLocal(args) {
  if (!args.id) {
    throw new Error('local:get requires --id');
  }

  return await withClient(async (client) => {
    const result = await client.query('select * from email where eml_id = $1', [Number(args.id)]);
    return {
      email: result.rows[0] ?? null,
      mode: 'structured',
      success: true,
    };
  });
}

async function status() {
  const config = await loadConfig();
  return {
    configured: {
      fromAddress: Boolean(config.fromAddress),
      inboundAddress: Boolean(config.inboundAddress),
      pollEnabled: config.pollEnabled,
      resendApiKey: Boolean(config.resendApiKey),
    },
    mode: 'structured',
    success: true,
  };
}

async function getConfig() {
  const config = await loadConfig();
  return {
    config,
    mode: 'structured',
    success: true,
  };
}

async function runRaw(args) {
  const config = await loadConfig();
  const module = await import(pathToFileURL(resolve(process.cwd(), args.script)).href);
  if (typeof module.default !== 'function') {
    throw new Error('Raw email script must export a default async function');
  }

  const result = await module.default({
    Client,
    config,
    input: args.input,
    Pool,
    Resend,
  });

  return {
    mode: 'raw',
    result,
    success: true,
  };
}

async function runStructured(args) {
  if (args.action === 'status') return await status();
  if (args.action === 'config:get') return await getConfig();
  if (args.action === 'send') return await sendEmail(args);
  if (args.action === 'inbox:list') return await listInbox(args);
  if (args.action === 'inbox:get') return await getInbox(args);
  if (args.action === 'sync-inbound') return await syncInbound(args);
  if (args.action === 'local:list') return await listLocal(args);
  if (args.action === 'local:get') return await getLocal(args);
  throw new Error(`Unsupported email action: ${args.action}`);
}

async function main() {
  const args = parseArgs(process.argv.slice(2));

  if (args.help) {
    print({
      usage:
        'email.mjs --action status|send|inbox:list|inbox:get|sync-inbound|local:list|local:get OR --script <path> [--input <json>]',
    });
  }

  if (!args.script && !args.action) {
    throw new Error('Email tool requires --action <name> or --script <path>');
  }

  const report = args.script ? await runRaw(args) : await runStructured(args);
  print({
    durationMs: Date.now() - startedAt,
    ...report,
  });
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
