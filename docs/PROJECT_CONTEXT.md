# Canonical Project Context

Last updated: 2026-08-20

## Product

The IIIT Lucknow Training & Placement Portal serves two roles:

- Students discover opportunities, maintain profiles and resumes, apply, track outcomes, submit feedback, request NOCs, and access placement resources.
- Administrators manage announcements, companies, job profiles, applications, students, feedback, NOCs, team members, administrators, and placement analytics.

## Current architecture

The repository is split into three services, each with its own container.

| Directory | Role |
|---|---|
| `frontend/` | Next.js 16 App Router, React 19, strict TypeScript. UI, routing, session handling. |
| `backend/` | FastAPI + SQLAlchemy 2 + Pydantic 2 on Python 3.12. Owns application data access. |
| `database/` | Prisma 6 schema, migrations, and seed. Owns the database structure. |

- `frontend` and `database` are npm workspaces sharing one lockfile at the repository root. A single Prisma schema cannot resolve a client across two independent `node_modules` trees, so do not give either package its own lockfile.
- Tailwind CSS 4 plus repository-owned CSS in `frontend/src/app/globals.css` and `admin.css`
- Auth.js v5 beta with Google OAuth and JWT sessions
- Zod for validation in the frontend, Pydantic in the backend
- Lucide for icons
- Node's test runner with `tsx` for frontend units; pytest for the backend
- Docker Compose for the full stack, with a hot-reload override

See `docs/DECISIONS.md` (2026-08-20) for why data access moved to FastAPI while Prisma kept the schema.

## Data ownership

`database/prisma/schema.prisma` is authoritative for the database structure. The SQLAlchemy models in `backend/app/models/db.py` mirror it and must never call `Base.metadata.create_all()` or otherwise migrate. Any schema change is a Prisma migration plus a matching model update.

Main entities: User, Account, Session, Company, JobProfile, Application, Announcement, Feedback, NocRequest, Resume, Coordinator, TeamMember, Notification.

Important invariants:

- One application per student/job profile.
- Company names, user emails, and student roll numbers are unique where present.
- Job eligibility is evaluated from the student's current profile and job criteria.
- Sensitive Aadhaar/PAN fields contain encrypted payloads, not plaintext.
- Destructive administrative operations require server-side admin authorization.

## Authentication and roles

Google is the only sign-in method. There are no password accounts in any environment, and the Auth.js credentials provider has been removed.

- Students must hold a Google account on `STUDENT_EMAIL_DOMAIN` (default `iiitl.ac.in`), matched on the exact domain so lookalike domains are rejected.
- `ADMIN_EMAILS` is the only source of the `ADMIN` role. There is no built-in administrator; when the variable is empty, nobody is an administrator.
- An address in `ADMIN_EMAILS` may sign in from outside the institute domain.
- Roles are recomputed from `ADMIN_EMAILS` on every request and reconciled in the database on every sign-in, so removing an address revokes access immediately.
- `require_admin` in `backend/app/core/security.py` re-checks the allowlist instead of trusting the signed role claim, so a previously issued token cannot outlive its grant.
- `/admin/*` additionally requires the `ADMIN` role through `frontend/src/proxy.ts`.
- The frontend calls the backend with a short-lived HS256 JWT signed with the shared `AUTH_SECRET`.

The reusable access rules live in `frontend/src/lib/auth-access.ts` with unit tests. Do not re-implement domain or allowlist checks in a page component.

## Core workflow

1. Profile data supplies CGPA, batch, branch, backlogs, bans, document completeness, and the default resume.
2. Company Events presents job profiles and evaluates the profile against job criteria.
3. An eligible student applies with a selected/default resume.
4. Applications tracks `APPLIED → SHORTLISTED → INTERVIEW → SELECTED` plus rejected/withdrawn outcomes.
5. Dashboard aggregates open roles, deadlines, announcements, eligibility, and application counts.

The reusable eligibility rules live in `frontend/src/lib/eligibility.ts` and `backend/app/services/eligibility.py`. Do not implement a third eligibility algorithm in a page component.

## UI system

The palette is sampled from the institute logo (`frontend/public/iiitl-logo.png`)
and declared as CSS custom properties in `frontend/src/app/globals.css`. Use the
tokens rather than new literal hex values.

- Primary blue: `#005F99` (`--blue`) — the logo letterforms
- Deep blue: `#00446D` (`--navy`) and `#002F4D` (`--navy-deep`) — sidebars, banners
- Circuit green: `#008325` (`--green`) — success and positive states
- Arch orange: `#DE6C1A` (`--orange`) — eyebrows, CTAs, active markers
- Brown: `#782D0D` (`--brown`) — deep warm accents
- Surface: `#F5F7FB` (`--surface`), ink `#102033`, muted `#64748B`, border `#E2E8F0`
- Rounded cards, restrained shadows, high information density, and mobile-first responsive layouts
- Student pages use `PortalShell`; admin pages use `AdminShell`.
- Use CSS transitions only unless the architecture decision is deliberately changed.

## Repository map

```text
frontend/src/app/                Routes, layouts, route handlers
frontend/src/components/layout/  Student navigation shell
frontend/src/components/admin/   Admin shell and management surfaces
frontend/src/lib/                Auth, backend client, encryption, eligibility
backend/app/core/                Config, database session, security, storage
backend/app/routers/             HTTP endpoints
backend/app/schemas/             Pydantic request/response models
backend/app/services/            Business rules
backend/tests/                   pytest suite
database/prisma/                 Schema, migrations, seed
database/scripts/                Administrative maintenance scripts
docs/                            Shared project memory and decisions
```

## Environment

- One `.env` at the repository root serves every service. Compose reads it automatically.
- Compose builds the in-cluster `DATABASE_URL` from `POSTGRES_*`; the `DATABASE_URL` in `.env` points at `localhost` and is only for host-side tooling such as the Prisma CLI.
- `frontend/next.config.ts` loads the root `.env` because Next only looks inside its own directory.
- Frontend on port 3000, backend on port 8000, PostgreSQL on port 5432.
- `/api/health` on both the frontend and the backend is the health endpoint.
- Google callback: `http://localhost:3000/api/auth/callback/google` locally.
- Compose fails fast if `AUTH_SECRET`, `ENCRYPTION_KEY`, or the Google credentials are missing.
- `.env` is private and must never be committed.

## Current implementation boundary

Data access is mid-migration. Profile, resumes, NOC/forms, uploads, and feedback submission call FastAPI through `frontend/src/lib/api-client.ts`. The dashboard, company events, applications, feedback listing, and every `/admin` surface still call Prisma directly from Next.js server components and actions; porting them to backend endpoints is the outstanding work from the 2026-08-20 decision.

Google-authenticated students are resolved to their Auth.js/Prisma `User`. The student shell, dashboard, company events, eligibility, applications, core profile fields, and feedback read user-owned records and show explicit empty/incomplete states instead of demonstration data. The admin shell identity, overview metrics, company management, student directory/profile inspection, and job-profile publishing are persistent. Resume file storage, NOC workflows, team/contact management, announcements, and the remaining admin workflows are incomplete and show explicit implementation states rather than fake records. Consult `docs/FEATURE_STATUS.md` before extending a feature.
