# Architectural Decisions

This is a lightweight decision log. Append a dated entry when changing a decision; do not rewrite history.

## 2026-07-12 — Full-stack Next.js

Use the Next.js App Router for UI, server actions, and route handlers so authorization and validation remain close to each workflow.

## 2026-07-12 — PostgreSQL and Prisma

Use PostgreSQL as the sole application database and Prisma as the sole ORM. Local development uses PostgreSQL 16 through Docker Compose.

## 2026-07-12 — Auth.js with JWT sessions

Use Google OAuth for institute accounts and JWT sessions for compatibility with database-free development credentials. Server-side route guards enforce roles.

## 2026-07-12 — Development credentials

Expose documented student/admin credentials only outside production so contributors can work before Google credentials are available.

## 2026-07-12 — Encrypted identity fields

Encrypt Aadhaar and PAN using AES-256-GCM with a 32-byte environment key. Store IV, authentication tag, and ciphertext together; never store plaintext.

## 2026-07-13 — Repository as shared agent memory

Treat `AGENTS.md` and `docs/PROJECT_CONTEXT.md` as the canonical onboarding context for humans and AI agents. Tool-specific instruction files must point back to these canonical files rather than duplicating project facts.

## 2026-07-17 — External administrator allowlist

Keep student Google access restricted to `@iiitl.ac.in`, while permitting explicitly trusted external Google accounts to receive `ADMIN` through the comma-separated `ADMIN_EMAILS` environment variable. Authorization remains enforced in the Auth.js callback and JWT role assignment.

## 2026-08-20 — FastAPI owns data access; Prisma owns the schema

Supersedes the data-access half of *2026-07-12 — Full-stack Next.js*. A FastAPI service had already been added under `backend/` without a decision entry, leaving two ORMs against one database: Prisma called directly from Next.js server actions, and SQLAlchemy behind FastAPI. That split is now resolved deliberately.

- `backend/` (FastAPI + SQLAlchemy) is the single owner of application data access. All remaining direct Prisma calls in the frontend are to be ported to backend endpoints.
- `database/` (Prisma) remains the single owner of the schema, migrations, and seed data. The SQLAlchemy models in `backend/app/models/db.py` mirror `schema.prisma` and must never run `create_all()` or otherwise migrate.
- `frontend/` is a Next.js UI client. It keeps Prisma only for the Auth.js adapter and the not-yet-ported pages listed in `docs/FEATURE_STATUS.md`.
- The frontend authenticates to the backend with a short-lived HS256 JWT signed with the shared `AUTH_SECRET`.

The Next.js App Router, server actions, and server-side authorization decisions from 2026-07-12 still stand; only the location of data access changed.

## 2026-08-20 — Service-per-container repository layout

Split the repository into `frontend/`, `backend/`, and `database/`, each with its own Dockerfile, plus `docker-compose.yml` for a production-style stack and `docker-compose.dev.yml` for hot reload. `frontend` and `database` are npm workspaces sharing one root lockfile, because a single Prisma schema cannot resolve a client across two independent `node_modules` trees. Compose builds the in-cluster `DATABASE_URL` from the `POSTGRES_*` values rather than passing the root `.env` value through, which points at `localhost` for host-side tooling.

Schema migrations run in a dedicated one-shot `migrate` container that must exit successfully before the backend starts, so no service ever boots against an out-of-date schema.

## 2026-08-20 — Google-only sign-in; `ADMIN_EMAILS` is the only admin source

Supersedes *2026-07-12 — Development credentials*.

- The Auth.js credentials provider is removed. Google is the only sign-in method in every environment. The previous development accounts returned synthetic user ids that did not exist in the database, which broke Prisma-backed admin pages.
- `placements@iiitl.ac.in` is no longer hardcoded as an administrator. `ADMIN_EMAILS` is the only source of the `ADMIN` role; when it is empty, nobody is an administrator.
- The student domain is configurable through `STUDENT_EMAIL_DOMAIN` and matched on the exact domain rather than a suffix, so lookalike domains cannot pass.
- Roles are recomputed from `ADMIN_EMAILS` on every request and reconciled in the database on every sign-in, so removing an address revokes access immediately instead of when the session expires. `require_admin` in the backend re-checks the allowlist rather than trusting the signed role claim alone.

## 2026-08-21 — Link Google accounts to existing users by email

Refines *2026-08-20 — Google-only sign-in*. The seed creates a `User` row for every address in `ADMIN_EMAILS` before that person has ever signed in. Auth.js refuses by default to attach an OAuth account to an existing user row with the same email, so every administrator's first Google sign-in failed with `OAuthAccountNotLinked`.

`allowDangerousEmailAccountLinking` is therefore enabled on the Google provider. The flag is only dangerous when a second, non-verifying provider can assert an address that already belongs to somebody else. Google is the only provider, the credentials provider is gone, and the `signIn` callback rejects a profile whose `email_verified` claim is `false`, so an address cannot be claimed without Google having verified ownership.

Do not add a second provider without revisiting this. Any provider that does not verify email ownership would, combined with this flag, allow account takeover by email collision.

## 2026-08-21 — Palette derived from the institute logo

Supersedes the navy/orange palette recorded under *UI system* in `docs/PROJECT_CONTEXT.md`. The previous colours (`#102A43`, `#2563EB`, `#F97316`) were generic Tailwind-family values chosen before the institute logo was available, and they did not match the mark shown in the header.

The palette is now sampled directly from `frontend/public/iiitl-logo.png`: blue `#005F99`, deep blue `#00446D`, circuit green `#008325`, arch orange `#DE6C1A`, brown `#782D0D`. These are declared as CSS custom properties in `globals.css` and the previously hardcoded brand hex values throughout `globals.css` and `admin.css` were migrated onto the same family.

Two consequences worth keeping:

- Success states moved from the teal-leaning emerald family to the logo's green, so positive feedback reads as part of the brand rather than as a generic Tailwind accent.
- Brand marks render the logo on a white tile. The logo's blue and green have too little contrast against the dark sidebar to sit directly on it, and recolouring the logo is not an option.

Add new colour work as tokens. Literal brand hex values in component styles are what made this migration a 108-replacement change rather than a one-line one.
