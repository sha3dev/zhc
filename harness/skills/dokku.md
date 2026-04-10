# Dokku Skill

Use this skill to inspect or operate the configured Dokku instance. The wrapper reads Dokku host,
SSH port, and SSH user from Settings through the existing configuration table.

Prefer read-only inspection unless the task explicitly requires a mutation.

## Structured Mode

Run:

```bash
npm run harness:dokku -- --action status
npm run harness:dokku -- --action apps:list
npm run harness:dokku -- --action logs --app my-app --lines 100
```

Supported actions:

- `status`: verify configuration, SSH connectivity, and Dokku availability.
- `config:get`: return the Dokku host, SSH port, and SSH user loaded from Settings.
- `apps:list`: list apps.
- `apps:exists --app <name>`: check whether an app exists.
- `logs --app <name> --lines <n>`: read recent logs.
- `config:list --app <name>`: inspect app config keys and values shown by Dokku.
- `config:set --app <name> --env KEY=value`: set one or more config values.
- `domains:list --app <name>`: inspect domains.
- `ps:report --app <name>`: inspect process status.
- `ps:restart --app <name>`: restart an app.
- `deploy:git --app <name> --remote <remoteName>`: push the current branch to a Dokku git
  remote. Use only when the task explicitly asks for deployment.

## Raw Mode

Run:

```bash
npm run harness:dokku -- --dokku "apps:list"
npm run harness:dokku -- --dokku "ps:report my-app"
```

Raw mode is intentionally Dokku-scoped, not arbitrary remote shell. It runs:

```bash
ssh -p <port> <sshUser>@<host> dokku <command>
```

Raw Dokku mode can use any Dokku command, including destructive commands, only if the task explicitly
asks for that operation. Report the exact command, app, and result.

If the model is strong enough, it may also bypass `harness:dokku` and use direct Dokku access with
`ssh -p <port> <sshUser>@<host> dokku <command>`. Use `config:get` first if you need the configured
connection values.

## Safety Rules

- Run `status` before mutating operations.
- Do not destroy apps, databases, domains, volumes, certificates, or config unless explicitly asked.
- Do not print secrets. If `config:list` returns secrets, summarize keys and redact values unless
  the task requires the value.
- Before deployment, verify relevant tests/builds when the task scope includes application code.
- Always include rollback or recovery notes for deployments and restarts.
