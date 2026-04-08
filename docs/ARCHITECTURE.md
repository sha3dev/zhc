# Architecture

## Overview

`zhc` is an npm workspace with two applications:

- `apps/server`: Hono HTTP server, business modules, SQL repositories, runtime composition
- `apps/web`: React SPA, routing, UI primitives, API client

The system is deployed as a single service. The server owns `/api/*` and serves the compiled SPA for browser routes.

## Server Design

The backend is a modular monolith:

```text
apps/server/src/modules/<domain>/
  application/
  domain/
  infrastructure/
  presentation/
```

Dependency direction:

```text
presentation -> application -> domain
infrastructure -> application + domain
app -> modules + shared
entrypoints -> app
```

Rules:

- HTTP handlers do not access SQL directly
- Validation happens at module boundaries with Zod
- Repositories live in `infrastructure`
- Shared code stays small and genuinely cross-cutting

## Web Design

The web app uses:

- React
- React Router
- a shared API client for all HTTP calls
- reusable UI primitives under `components/ui`

Rules:

- Route composition lives in the app entry layer
- API access is centralized
- page components own page-level orchestration, not low-level transport concerns

## Runtime

- `npm run dev` starts both apps from the repo root
- `npm run build` builds web first, then server
- `npm run start` starts only the server, which serves API + SPA
