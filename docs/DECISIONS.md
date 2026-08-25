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

## 2026-08-25 — Semantic light/dark theme system & left-aligned application funnel

- **Theme Architecture**: Added dark mode support across student and admin surfaces via semantic CSS custom properties in `globals.css` and `admin.css`. A React `ThemeProvider` (`theme-provider.tsx`) synchronized with `localStorage` and the OS `prefers-color-scheme` media query via `useSyncExternalStore` manages `'light' | 'dark' | 'system'` modes with zero hydration flash.
- **Application Funnel**: Redesigned the admin dashboard application funnel from a centered staggered layout to a left-aligned horizontal stage breakdown with proportional volume bars, stage indicators, and guarded conversion percentage calculations.

## 2026-08-25 — Hierarchical RBAC & Granular User Management

- Extended the database role hierarchy from binary `[STUDENT, ADMIN]` to `[STUDENT, COORDINATOR, OFFICER, ADMIN, SUPER_ADMIN]`.
- Implemented a 16-permission RBAC catalog across all portal domains with category groupings, role defaults, and custom per-user permission overrides (`customPermissions String[]` on `User`).
- Added full user management capabilities on `/admin/users` (user provisioning, role elevation & de-elevation, custom permission matrix configuration, account activation/suspension, and safe user deletion).
- Built security guardrails against self-demotion, self-deactivation, self-deletion, and removal of the last active super-administrator, while preserving `ADMIN_EMAILS` as the emergency bootstrap superadmin source.

## 2026-08-25 — Persistent Announcement Lifecycle Management

- Implemented persistent announcement management (`add`, `edit`, `delete`, `preview`, `filter`, and `tag`) across FastAPI (`/api/v1/announcements`) and Next.js admin & student surfaces.
- Secured administrative operations with `announcements:manage` permission checks (`SUPER_ADMIN`, `ADMIN`, `OFFICER`, `COORDINATOR` by default).
- Added multi-category classification (`COMPANY_EVENT` vs `GENERAL`), associated company tagging, and preset/custom pill tags (Shortlists, Interviews, Drive, PPT, Policies, Urgent).
- Enhanced student dashboard feed with search by title/content/tags/company, category filtering, tag indicators, and a detail inspection modal for multi-line instructions and test links.

## 2026-08-25 — NOC Requests & Support Feedback Lifecycle Workflows

- **NOC Requests Architecture**: Implemented full student lifecycle (`POST /api/v1/noc`, `PATCH /api/v1/noc/{id}/cancel`, inspection modal, signed certificate in-portal preview and download) and administrative management (`GET /api/v1/noc/admin`, `/approve`, `/reject`, `/document`, `/metrics`) guarded by `noc:manage` permission.
- **Signed Certificate Handling**: Signed NOC certificates are uploaded through authenticated multipart endpoints to disk storage (`noc_docs/`) and served with authorization checks allowing student owners and placement administrators to view and download their documents.
- **Feedback & Queries Lifecycle**: Implemented student submission (`POST /api/v1/feedback`) with multi-type categorization (`QUERY`, `FEEDBACK`, `COMPLAINT`) and structured JSON storage; student history with type/resolution filters; and administrative workspace (`GET /api/v1/feedback/admin`, `POST /api/v1/feedback/admin/{id}/respond`, `DELETE`) guarded by `feedbacks:manage` permission.
- **Student Notifications**: Admin NOC approval/rejection and feedback responses trigger automated in-app `Notification` records and background email dispatch.

## 2026-08-25 — Placement Team Lifecycle & Default Permissions Architecture

- **Dynamic Public Directory**: Replaced hardcoded presentation on `/team` and `/contact` with dynamic database loading of `TeamMember` records ordered by `displayOrder`, with photo and tonal initials avatar fallbacks.
- **Administrative Team Workspace**: Implemented full management on `/admin/team` (create, update, delete, reorder) guarded by `team:manage` permission, with linked `User` account indicators and direct links to User Management.
- **Default Permissions Management**: Added `SystemSetting` table (`key`, `value`, `updatedAt`) in Prisma and SQLAlchemy to persist the admin-configurable default permissions set for the single placement team (`placement_team_default_permissions`).
- **Automated Permission Synchronization**: Adding a team member with an email automatically assigns the placement team's default permissions to their `User.customPermissions` (and on new user creation in `auth.ts`). Removing a member automatically revokes the default permissions while preserving any prior custom permissions. Admins retain full control to further adjust individual permissions manually in User Management.





