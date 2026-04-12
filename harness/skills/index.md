# Harness Skills

These skills are specialized tool contracts injected into task execution prompts. They are not a
replacement for native workspace capabilities such as filesystem access, shell commands, Git, code
search, or package scripts.

Use a skill when the task needs one of these domain tools:

- `playwright-browser`: browser automation, screenshots, console/network diagnostics, and raw
  Playwright scripts.
- `steel-browser`: remote cloud browser sessions through Steel, with profiles, session viewer URLs,
  screenshots, downloads, and external-site browsing.
- `dokku`: inspect and operate the configured Dokku instance.
- `postgres`: run SQL or raw `pg` client scripts against `DATABASE_URL`.
- `http-client`: call HTTP endpoints or run raw `fetch` scripts.
- `email`: send mail, read inbound mail, sync the inbox, or run raw Resend scripts using Settings.

## Execution Modes

Prefer structured mode for simple tasks. It gives stable JSON output and reduces ambiguity.

Use raw mode when the task needs full API control, multi-step logic, custom assertions, or behavior
not covered by structured mode.

Raw mode is not limited to raw scripts inside our wrappers. If the model already has enough native
capability to use the underlying tool directly, it may do so. The wrappers are the recommended,
stable interface, not the only allowed interface.

Examples:

- Use Playwright directly from a custom script if that is clearer than `harness:browser`.
- Use `ssh ... dokku ...` directly if the task requires direct Dokku control.
- Use `psql`, `pg`, or a direct database client when that is more appropriate than `harness:postgres`.
- Use Resend directly when the task needs raw provider behavior.

When bypassing a wrapper, use the same safety rules, configuration sources, temporary file
conventions, and reporting discipline defined by the skill.

Temporary artifacts belong under `<working_directory>/tmp`. Put screenshots, scratch JSON, raw tool
scripts, downloads, traces, and other short-lived evidence there. Non-temporary deliverables belong
in the working directory at an intentional project path, not under `tmp`.

## Reporting Rules

- Report the command or script used, the target, and the result.
- For mutating operations, state why the mutation was required.
- Do not print secrets, tokens, connection strings, private keys, cookies, or full environment
  dumps.
- Treat failed tool output as evidence. Include the failing action and the concise error.
