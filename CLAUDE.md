# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

CID Feegow Platform — monorepo with an authenticated dashboard for analyzing beneficiaries by company from the `cad_plano_benef` table and CID (diagnostic codes) from the `diagnostics` table in the `cid_feegow` PostgreSQL database.

## Commands

```bash
# Install all workspaces
npm install

# Shared package must be built first (other workspaces depend on it)
npm run build --workspace packages/shared

# Development
npm run dev:api          # API with tsx watch (port 3333)
npm run dev:web          # Vite dev server (port 5175)

# Build all
npm run build

# Type-check (lint = tsc --noEmit for all workspaces)
npm run lint

# Docker (API + Web only; PostgreSQL is external)
docker compose up --build

# Utility scripts
npm --workspace apps/api run create-user              # Create a user via CLI
npm --workspace apps/api run refresh-cid-cache         # Refresh CID dashboard materialized cache
```

No automated test suites exist yet. `npm run test` is a no-op across all workspaces.

## Architecture

**Monorepo with npm workspaces** — three packages:

- **`packages/shared`** (`@andre/shared`): TypeScript interfaces and types shared between API and web. Must be built before other workspaces. All API response shapes and filter types are defined in `src/contracts.ts`.

- **`apps/api`** (`@cid-feegow/api`): Express + TypeScript backend. Key layers:
  - `src/config/env.ts` — Zod-validated env config (loads `.env` from multiple candidate paths)
  - `src/db/pool.ts` — single `pg` Pool instance
  - `src/db/queries/` — raw SQL query modules (`dashboard.ts`, `cid-dashboard.ts`, `cid-dashboard-cache.ts`, `auth.ts`)
  - `src/routes/` — Express routers: `auth`, `dashboard`, `beneficiarios`, `exports`, `users`
  - `src/middleware/` — `require-auth` (JWT), `require-role`, `error-handler`
  - `src/services/` — business logic (`auth-service`, `user-service`, `dashboard-service`)
  - `src/lib/` — utilities: `jwt.ts`, `password.ts` (bcrypt), `app-error.ts`, `dashboard-pdf.ts`, `cid-dashboard-pdf.ts` (PDFKit report generation)
  - `src/scripts/` — CLI scripts (`create-user.ts`, `refresh-cid-dashboard-cache.ts`)

- **`apps/web`** (`@andre/web`): React 18 + Vite + TailwindCSS + shadcn/ui-style components. Key structure:
  - `src/app/router.tsx` — react-router-dom routes
  - `src/lib/auth.tsx` — auth context/provider with JWT token management
  - `src/lib/http.ts` — HTTP client (fetch wrapper with auth headers)
  - `src/pages/` — `dashboard-page`, `cid-dashboard-page`, `company-detail-page`, `users-page`, `login-page`
  - `src/components/charts/` — Recharts-based visualizations
  - `src/components/ui/` — Radix UI primitives (button, dialog, table, card, etc.)

- **`infra/sql/bootstrap_auth.sql`** — DDL for `app_users`, `app_auth_sessions`, `app_audit_logs` tables

## Auth Flow

JWT-based. `/auth/login` returns an access token. All routes except `/health` and `/auth/*` require the `require-auth` middleware. Roles: `admin` (full CRUD on users) and `reader` (read-only dashboards).

## Environment Variables

Root `.env` supplies PostgreSQL credentials (`DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD`). API-specific vars: `JWT_SECRET` (required, min 16 chars), `JWT_EXPIRES_IN`, `APP_ORIGIN`, `APP_ORIGINS` (comma-separated), `HOST`, `PORT`, `RATE_LIMIT_LOGIN_MAX`, `RATE_LIMIT_LOGIN_WINDOW_MS`. See `apps/api/.env.example`.

## Key Conventions

- Database column names are case-sensitive — use double quotes in SQL (e.g., `"Codigo"`, `"DataHora"`).
- When writing `updateUser`-style dynamic queries, always map JS property names to SQL column names via an explicit map (see `UPDATE_COLUMN_MAP` in `auth.ts`).
- The shared package uses `@andre/shared` as its npm name in imports.
- TypeScript strict mode is enabled across all workspaces (`tsconfig.base.json`).
- The web app uses `@/` path alias for `src/` imports.
- Rate limiting is applied to auth endpoints via in-memory store (`middleware/rate-limit.ts`).
- The API has graceful shutdown handling (SIGTERM/SIGINT) that closes the HTTP server and database pool.
