# Agent Operating Guide

This file applies to the entire repository. Every coding agent must read this file and `docs/PROJECT_CONTEXT.md` before planning or editing. The repository is the shared memory; chat history is not authoritative.

## Source-of-truth order

When sources disagree, use this order:

1. Current code, Prisma schema, tests, and configuration
2. `docs/PROJECT_CONTEXT.md`
3. `docs/DECISIONS.md`
4. `docs/FEATURE_STATUS.md`
5. `IMPLEMENTATION_PLAN.md` (historical product plan; some choices have evolved)

Never silently change an established architectural decision. Record intentional changes in `docs/DECISIONS.md` and update the project context in the same change.

## Required workflow

1. Inspect `git status` and preserve unrelated or user-owned changes.
2. Read the files relevant to the module before editing.
3. Make the smallest coherent change that completes the requested behavior.
4. Validate external input with Zod at server boundaries.
5. Enforce authentication and authorization on the server, not only in the UI.
6. Add or update tests for reusable business logic.
7. Run `npm run lint`, `npm run type-check`, `npm test`, and `npm run build` before handing off a substantial change.
8. Update `docs/FEATURE_STATUS.md` when a feature moves between mock, partial, and persistent states.
9. Update `docs/HANDOFF.md` before handing unfinished work to another contributor or agent.

## Non-negotiable constraints

- Services: `frontend/` (Next.js App Router, React, strict TypeScript), `backend/` (FastAPI, Python 3.12), `database/` (Prisma schema and migrations). Keep changes inside the service that owns the concern.
- Data access belongs in the FastAPI backend. Do not add new direct Prisma calls to the frontend; the remaining ones are legacy and listed in `docs/FEATURE_STATUS.md`.
- Database: PostgreSQL. Prisma owns the schema and migrations; SQLAlchemy mirrors it read/write and must never call `create_all()`. Do not add a third data layer.
- `frontend` and `database` are npm workspaces sharing the root lockfile. Do not give either its own `package-lock.json`.
- Authentication: Auth.js with Google as the only provider. Students are restricted to `STUDENT_EMAIL_DOMAIN`; `ADMIN_EMAILS` is the only source of the `ADMIN` role. Never reintroduce a password provider or hardcode an administrator address.
- Sensitive identity values must use the AES-256-GCM helpers in `frontend/src/lib/encryption.ts` and `backend/app/core/encryption.py`; never log or return raw Aadhaar/PAN values.
- Resume uploads must be PDF-only, size-limited, and authorized by user ownership when persistence is added.
- Keep secrets in `.env`; never commit, print, or copy real secrets into documentation.
- Use the established navy/orange design tokens and existing responsive shells.
- Prefer shared components and `src/lib` business functions over duplicating logic inside pages.
- Do not describe local component state as database persistence.

## Project commands

Full stack in containers:

```bash
docker compose up --build
docker compose -f docker-compose.yml -f docker-compose.dev.yml up --build   # hot reload
```

Host-side, from the repository root:

```bash
npm install
docker compose up -d db
npm run db:migrate
npm run db:seed
npm run dev
```

Verification (root, then `backend/`):

```bash
npm run lint
npm run type-check
npm test
npm run build
cd backend && pytest
```

## Change boundaries

- Student UI belongs under `frontend/src/app` student routes and `frontend/src/components` feature folders.
- Admin UI belongs under `frontend/src/app/admin` and `frontend/src/components/admin`.
- Reusable frontend rules such as eligibility, access control, and encryption belong under `frontend/src/lib` with unit tests.
- API endpoints belong in `backend/app/routers` with Pydantic schemas in `backend/app/schemas` and business rules in `backend/app/services`, covered by `backend/tests`.
- Schema changes require a Prisma migration in `database/`, a matching update to `backend/app/models/db.py`, and an update to seed data when relevant.
- New environment variables must be documented in `.env.example` and `README.md` without real values, and wired into `docker-compose.yml` for whichever services need them.

## Definition of done

A change is done only when behavior, authorization, validation, empty/error/loading states, responsive layout, tests, and documentation are consistent. If credentials or an external service prevent full verification, state the exact unverified boundary in the handoff.
