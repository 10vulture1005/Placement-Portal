# Team Handoff

This file carries short-lived working context between teammates and agents. Canonical architecture belongs in `PROJECT_CONTEXT.md`; durable decisions belong in `DECISIONS.md`.

## Current state

- Active objective: finish moving data access from Prisma-in-Next.js to FastAPI endpoints
- Active owner: unassigned
- Branch: main working tree contains the service split, containerization, and the auth rework
- Last verified: `npm run lint`, `npm run type-check`, 20 frontend unit tests, 11 backend pytest tests, and a full `docker compose up --build`. All three images build; `db`, `backend`, and `frontend` all report healthy; `migrate` applies both migrations and seeds administrators from `ADMIN_EMAILS`, then exits. Both `/api/health` endpoints return 200, protected routes 307 to `/login`, and an unauthenticated backend call returns 401.
- Not yet exercised: an actual Google sign-in round trip, and every workflow behind it. Only unauthenticated behavior has been smoke-tested against the running stack.
- External blocker: resume/document storage provider has not been selected

## What changed in this pass

1. Split the repository into `frontend/`, `backend/`, and `database/`. `frontend` and `database` are npm workspaces sharing the root lockfile.
2. Added `frontend/Dockerfile`, `frontend/Dockerfile.dev`, `backend/Dockerfile`, `backend/Dockerfile.dev`, and `database/Dockerfile`, plus `docker-compose.yml` and `docker-compose.dev.yml`. Migrations run in a one-shot `migrate` container that must exit successfully before the backend starts.
3. Removed the Auth.js credentials provider and the hardcoded `placements@iiitl.ac.in` administrator. `ADMIN_EMAILS` is now the only source of the `ADMIN` role, roles are recomputed per request, and `require_admin` in the backend re-checks the allowlist.
4. Pinned `@auth/core` to `0.41.2` in root `overrides`. `next-auth` and `@auth/prisma-adapter` otherwise resolve different patch versions, which makes their `Adapter` and `JWT` types structurally incompatible and breaks `npm run type-check`.
5. Removed committed `__pycache__` bytecode and expanded `.gitignore`.
6. Made the `AUTH_SECRET` check lazy in `frontend/src/lib/auth.ts`. Throwing at module load broke `next build` inside the image, because the build runs with `NODE_ENV=production` and no secret. The check now runs when a session is actually issued.

## Known next work

1. Port the remaining direct Prisma call sites to FastAPI endpoints. `docs/FEATURE_STATUS.md` lists them under the "Prisma direct" data path; the admin surfaces and the dashboard are the bulk of it.
2. Sign in with Google against the running stack and walk the student and admin journeys end to end.
3. Select a storage provider and implement PDF-only resume upload with ownership checks.
4. Add persistent announcement publishing and administrator application review.
5. Add encrypted Aadhaar/PAN profile actions using the existing encryption helper.

## Watch out for

- `frontend/next.config.ts` loads the root `.env` through `process.loadEnvFile`, because Next only reads `.env` from its own directory. Removing that breaks host-side `npm run dev`.
- Compose deliberately ignores the root `DATABASE_URL` and builds an in-cluster URL from `POSTGRES_*`. The `.env` value points at `localhost` and is only correct for host-side tooling.
- Next.js workspace builds nest the standalone server at `.next/standalone/frontend/server.js`, which is why the runner stage copies that layout and runs `node frontend/server.js`.
- `TEST_LOGIN_ENABLED`, `TEST_STUDENT_EMAIL`, `TEST_STUDENT_PASSWORD`, `TEST_ADMIN_EMAIL`, and `TEST_ADMIN_PASSWORD` are dead variables. Anyone who relied on the old password login must be added to `ADMIN_EMAILS` and sign in with Google instead.
- Do not reintroduce module-scope environment validation in `frontend/src/lib/auth.ts`. `next build` evaluates that module without runtime secrets, so any throw there fails the image build. Compose already fails fast on missing secrets through `${VAR:?}`.

## Handoff template

Copy this section when handing off active work:

```text
Objective:
Owner/agent:
Branch:
Files changed:
Behavior completed:
Verification run:
Known failures:
Blockers/credentials needed:
Recommended next action:
```

Do not place secrets, tokens, private student information, or uploaded files in this document.
