# Feature Status

Use `Persistent`, `Partial`, `Local`, or `Planned`. Update this file in the same pull request that changes a status.

The **Data path** column records which service reaches the database, because moving every path to `FastAPI` is the outstanding work from the 2026-08-20 decision in `docs/DECISIONS.md`.

| Module | Status | Data path | Current boundary | Next backend step |
|---|---|---|---|---|
| Authentication/RBAC | Partial | Prisma (Auth.js adapter) | Google-only sign-in; exact-domain student check; `ADMIN_EMAILS` as the sole admin source with per-request role recomputation and login-time reconciliation; backend re-checks the allowlist | Verify production callback/cookies and deployment secrets |
| Database/schema | Persistent | Prisma (owner) | Migrations and seed exist; seed creates accounts from `ADMIN_EMAILS` | Add migrations with each schema change |
| Dashboard | Persistent | Prisma direct | Authenticated metrics, deadlines, announcements, and eligibility use Prisma records | Port to FastAPI endpoints |
| Company Events | Persistent | Prisma direct | Admin-published jobs and per-student eligibility use Prisma and shared rules | Port to FastAPI; add attachments and selected-resume association |
| Apply flow | Partial | Prisma direct | Authorized eligibility recheck and unique Application creation persist | Port to FastAPI; store the selected resume on each application |
| Applications | Persistent | Prisma direct | User-owned applications, status timeline, and guarded withdrawal persist | Port to FastAPI; add status history and interview scheduling |
| Profile | Partial | FastAPI | Identity and core profile fields read/write through the backend | Add encrypted Aadhaar/PAN entry |
| Resumes | Partial | FastAPI | Typed list and PDF/size-validated upload call the backend | Storage provider is still unselected; see the blocker below |
| Feedback | Partial | Mixed | Submission calls FastAPI; listing still reads Prisma directly | Port listing to FastAPI; add admin response action and notifications |
| Forms/NOC | Partial | FastAPI | Typed list and create call the backend | Add cancel plus admin approval and document storage |
| Contact/Team | Local | none | Public directory presentation | Read TeamMember records through FastAPI |
| Admin dashboard | Persistent | Prisma direct | Live totals, application funnel, branch placement, recent applications | Port to FastAPI; add date/cohort filters and export |
| Admin companies | Persistent | Prisma direct | Authorized create, edit, list, search, guarded delete | Port to FastAPI; add logo upload and recruiter contacts |
| Admin job profiles | Persistent | Prisma direct | Authorized create, edit, list, filter, publish/end, guarded delete | Port to FastAPI; add attachments and coordinators |
| Admin students | Persistent | Prisma direct | Authorized searchable directory and read-only detail | Port to FastAPI; add cohort filters and export |
| Remaining admin management | Planned | none | Honest implementation states with no fake records | Add guarded FastAPI endpoints, starting with announcements and applications |
| File uploads | Planned | FastAPI (Cloudinary) | Endpoint and PDF/size validation exist; no provider credentials configured | Choose and configure a provider; enforce ownership |
| Email/notifications | Planned | none | Notification schema exists | Configure Resend and event-driven messages |
| Encryption | Persistent utility | n/a | AES-256-GCM helper and tests exist in both services | Integrate into profile write paths |
| CI/Docker | Persistent | n/a | Per-service Dockerfiles, prod and dev Compose stacks, one-shot migration container, health routes, three-job CI. Verified end to end: all images build and the stack reaches healthy with migrations and admin seeding applied. | Add a deployment target and production secrets |

## Open blockers

- **Resume/document storage provider is unselected.** `backend/app/core/storage.py` is written against Cloudinary and no credentials are configured, so uploads cannot succeed yet. Choosing a provider (Cloudinary, S3, or a self-hosted MinIO container added to Compose) is a decision that belongs in `docs/DECISIONS.md`.
