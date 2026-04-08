# zhc

TypeScript monorepo for an agent orchestration system, shipped as a single web application backed by a Hono API.

## Workspace Layout

```text
apps/
  server/  Hono API, domain modules, persistence, runtime
  web/     React application and UI
docs/
  ARCHITECTURE.md
  CONTRIBUTING.md
  ENGINEERING_STANDARDS.md
```

## Architecture

- `apps/server` is a modular monolith organized by domain module.
- `apps/web` is a React SPA using React Router.
- Production runs as one service: the server exposes `/api/*` and serves the compiled SPA.
- Development is started from the repo root with one command.

## Commands

```bash
npm run dev
npm run build
npm run start
npm run lint
npm run typecheck
npm run test
```

## Quality Bar

- TypeScript strict mode is required.
- Biome is the single source of truth for formatting and linting.
- Domain logic stays in server modules, not in entrypoints or generic utilities.
- Frontend API calls go through the shared HTTP client in `apps/web/src/lib/api.ts`.
- Technical code, comments, tests, and docs stay in English.

## Documentation

- [Architecture](docs/ARCHITECTURE.md)
- [Engineering Standards](docs/ENGINEERING_STANDARDS.md)
- [Contributing](docs/CONTRIBUTING.md)
- [AGENTS.md](AGENTS.md)
