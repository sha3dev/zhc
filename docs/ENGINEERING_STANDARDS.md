# Engineering Standards

## Principles

- Prefer simple, explicit code over clever abstractions.
- Keep modules cohesive and predictable.
- Optimize for maintainability and operational simplicity.

## TypeScript

- Use `strict` mode everywhere.
- Use explicit types at boundaries and inferred types inside local implementation details.
- Use `import type` when importing types only.
- Avoid `any`. If a boundary is unknown, narrow it immediately.

## Formatting and Linting

- Biome is the only formatter and linter.
- Do not hand-format around Biome output.
- Keep imports organized automatically.

## Comments and Docs

- Write code and technical docs in English.
- Add comments only for intent, invariants, or tradeoffs.
- Do not add comments that restate obvious code.
- Keep README and docs aligned with the actual repo shape.

## Structure

- Server business code lives under `apps/server/src/modules`.
- Cross-cutting server code lives under `apps/server/src/shared`.
- Frontend route and page orchestration lives in `apps/web/src`.
- Reusable UI primitives belong in `apps/web/src/components/ui`.

## Testing

- Unit-test application behavior and contracts.
- HTTP tests should verify route envelopes and boundary behavior.
- Do not rely on database access in unit tests.

## Operational Rules

- Keep `/api/*` stable unless a functional change requires otherwise.
- Prefer one obvious command for each workflow: dev, build, start, lint, typecheck, test.
- Remove dead scripts, stale configs, and obsolete docs when they stop being source of truth.
