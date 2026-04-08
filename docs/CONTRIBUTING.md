# Contributing

## Quality Bar

This repository targets a high standard of readability, consistency, and maintainability. A change is not complete just because it works. It must also fit the architecture and simplify the system.

## Core Rules

- Use the module structure under `apps/server/src/modules`
- Do not connect HTTP handlers directly to repositories
- Keep domain types separate from HTTP DTOs
- Do not introduce implicit singletons outside `apps/server/src/app`
- Keep business logic out of `entrypoints`, `presentation`, and generic shared utilities
- Do not add `console.log` to application code
- Prefer typed errors over `throw new Error(...)` for expected control flow
- Keep all repo-facing content in technical English

## Local Workflow

```bash
npm run lint
npm run typecheck
npm run test
npm run build
```

`npm run check` is the full local quality pipeline.

## Conventions

### Imports

- Use clear relative imports
- Avoid global barrel files except a module's local `index.ts`
- Keep `shared` small; if something belongs to one domain, it should live in that module
- Frontend HTTP access must go through the shared API client

### Testing

- Unit tests should focus on contracts and behavior
- Mock infrastructure at the application layer
- Add HTTP tests for input/output contracts
- SQL repository tests should verify mapping and query behavior, not re-test application workflows end to end

### Pull Requests

Each pull request should explain:

- what changed
- what became simpler
- what risk remains
- how the change was validated
