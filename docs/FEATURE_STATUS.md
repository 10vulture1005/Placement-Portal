# Feature Status

Use `Persistent`, `Partial`, `Local`, or `Planned`. Update this file in the same pull request that changes a status.

The **Data path** column records which service reaches the database, because moving every path to `FastAPI` is the outstanding work from the 2026-08-20 decision in `docs/DECISIONS.md`.

| Module | Status | Data path | Current boundary | Next backend step |
|---|---|---|---|---|
| Authentication/RBAC | Persistent | FastAPI / Prisma fallback | 5-tier role hierarchy (`STUDENT`, `COORDINATOR`, `OFFICER`, `ADMIN`, `SUPER_ADMIN`), granular 16-permission RBAC catalog, per-user custom permission matrix, user provisioning, elevation/de-elevation, emergency `ADMIN_EMAILS` bootstrap | Verify production callback/cookies and deployment secrets |
| Database/schema | Persistent | Prisma (owner) | Migrations and seed exist; seed creates accounts from `ADMIN_EMAILS` | Add migrations with each schema change |
| Dashboard | Persistent | Prisma direct | Authenticated metrics, deadlines, announcements, and eligibility use Prisma records | Port to FastAPI endpoints |
| Company Events | Persistent | Prisma direct | Admin-published jobs and per-student eligibility use Prisma and shared rules | Port to FastAPI; add attachments and selected-resume association |
| Apply flow | Persistent | FastAPI / Prisma fallback | Server-side eligibility check, resume selection, and unique Application creation persist | Add custom application questions if required |
| Applications | Persistent | FastAPI / Prisma fallback | User-owned applications, stage timeline, resume association, and guarded withdrawal persist | Add interview slot booking |
| Profile | Persistent | FastAPI / Prisma fallback | Identity and core profile fields with AES-256-GCM encrypted Aadhaar/PAN numbers and encrypted identity document files with challenge-unlock preview | Add profile picture upload if needed |
| Resumes | Persistent | FastAPI / Local & Cloud storage | Typed list, upload with custom labels, rename, delete, secure in-portal PDF preview, and application attachment | Add multi-version comparison |
| Feedback | Partial | Mixed | Submission calls FastAPI; listing still reads Prisma directly | Port listing to FastAPI; add admin response action and notifications |
| Forms/NOC | Persistent | FastAPI / Local storage | Typed list, NOC creation with validation; official placement policy and template downloads available | Add cancel plus admin approval and document storage |
| Contact/Team | Local | none | Public directory presentation | Read TeamMember records through FastAPI |
| Admin dashboard | Persistent | Prisma direct | Live totals, application funnel, branch placement, recent applications | Port to FastAPI; add date/cohort filters and export |
| Admin companies | Persistent | Prisma direct | Authorized create, edit, list, search, guarded delete | Port to FastAPI; add logo upload and recruiter contacts |
| Admin job profiles | Persistent | Prisma direct | Authorized create, edit, list, filter, publish/end, guarded delete | Port to FastAPI; add attachments and coordinators |
| Admin students | Persistent | Prisma direct | Authorized searchable directory and read-only detail | Port to FastAPI; add cohort filters and export |
| Admin applications | Persistent | FastAPI / Prisma fallback | Authorized candidate list, filtering by job/status/branch, single & bulk stage progression, CSV export | Add custom stage emails |
| Admin announcements | Persistent | FastAPI / Prisma fallback | Authorized create, edit, list, search, category & company filter, tags management, preview, and guarded delete | Add rich-text editor option and attachment uploads |
| Remaining admin management | Planned | none | Honest implementation states with no fake records | Add feedback response and NOC approval workflows |
| File uploads | Persistent | FastAPI (Cloudinary / Local fallback) | PDF/size validation, local disk fallback with UUID naming, and authenticated streaming route | Add S3 provider option if required |
| Email/notifications | Persistent | FastAPI / Resend fallback | In-app notification creation with non-blocking email dispatch and graceful dummy-key handling | Add email template customization |
| Encryption | Persistent utility | n/a | AES-256-GCM helper and tests exist in both services; active on Aadhaar and PAN | Integrate into other sensitive fields as needed |
| CI/Docker | Persistent | n/a | Per-service Dockerfiles, prod and dev Compose stacks, one-shot migration container, health routes, three-job CI. Verified end to end: all images build and the stack reaches healthy with migrations and admin seeding applied. | Add a deployment target and production secrets |

## Open blockers

*None currently blocking core student or admin workflows.*

