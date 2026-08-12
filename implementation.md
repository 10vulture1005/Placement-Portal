# FastAPI Backend — Implementation Plan
### IIIT Lucknow Placement Portal

## Overview

This plan describes the full separation of the portal's backend into a standalone **FastAPI** service. The current codebase has all data-access logic embedded inside Next.js Server Actions and page components (direct Prisma calls). The goal is to strip Next.js down to a **pure frontend** that communicates only through a well-defined REST API served by FastAPI. Both services share the same PostgreSQL database but all business logic, validation, and auth verification moves to FastAPI.

---

## Architecture

```
┌──────────────────────┐        REST/JSON         ┌────────────────────────────┐
│   Next.js Frontend   │  ──────────────────────▶  │    FastAPI Backend          │
│   (port 3000)        │  ◀──────────────────────  │    (port 8000)             │
│                      │                           │                            │
│  - Pages/components  │                           │  - All DB access           │
│  - Auth UI (OAuth)   │                           │  - Eligibility engine      │
│  - Form rendering    │                           │  - Encryption/decryption   │
│  - Token forwarding  │                           │  - File uploads            │
└──────────────────────┘                           │  - Email/notifications     │
                                                   └────────────────────────────┘
                                                              │
                                                              ▼
                                                   ┌──────────────────────┐
                                                   │   PostgreSQL 16      │
                                                   │   (port 5432)        │
                                                   └──────────────────────┘
```

### Authentication flow with separate backend

```
1. User clicks "Sign in with Google" on Next.js
2. Auth.js handles Google OAuth, creates/updates User in DB via Prisma adapter
3. Auth.js issues a signed JWT stored in an HttpOnly cookie on the Next.js domain
4. Every API call from Next.js → FastAPI includes that JWT in the Authorization header
5. FastAPI verifies the JWT signature using AUTH_SECRET (shared env var)
6. FastAPI decodes the user id + role and authorizes the request
```

> No separate user database. Both services share the same PostgreSQL instance. FastAPI reads/writes the same tables that Prisma created.

---

## New Directory Structure

```
Placement-Portal/                ← existing repo
├── src/                         ← Next.js frontend (keep, strip server actions)
├── prisma/                      ← schema stays here, owned by Next.js migrations
├── backend/                     ← NEW: FastAPI service
│   ├── main.py
│   ├── requirements.txt
│   ├── Dockerfile
│   ├── app/
│   │   ├── core/
│   │   │   ├── config.py        ← env var loading (pydantic-settings)
│   │   │   ├── database.py      ← SQLAlchemy async engine + session
│   │   │   ├── security.py      ← JWT decode, role guards
│   │   │   ├── encryption.py    ← AES-256-GCM port from src/lib/encryption.ts
│   │   │   └── storage.py       ← Cloudinary / S3 upload helpers
│   │   ├── models/
│   │   │   └── db.py            ← SQLAlchemy ORM models (mirror Prisma schema)
│   │   ├── schemas/
│   │   │   ├── student.py       ← Pydantic request/response models
│   │   │   ├── company.py
│   │   │   ├── job.py
│   │   │   ├── application.py
│   │   │   ├── feedback.py
│   │   │   ├── noc.py
│   │   │   ├── announcement.py
│   │   │   ├── team.py
│   │   │   └── notification.py
│   │   ├── routers/
│   │   │   ├── auth.py
│   │   │   ├── dashboard.py
│   │   │   ├── students.py
│   │   │   ├── companies.py
│   │   │   ├── jobs.py
│   │   │   ├── applications.py
│   │   │   ├── feedback.py
│   │   │   ├── noc.py
│   │   │   ├── announcements.py
│   │   │   ├── team.py
│   │   │   ├── uploads.py
│   │   │   └── notifications.py
│   │   ├── services/
│   │   │   ├── eligibility.py   ← port of src/lib/eligibility.ts
│   │   │   ├── email.py         ← Resend integration
│   │   │   └── notifications.py ← in-app notification creation
│   │   └── dependencies.py      ← FastAPI dependency injection (get_db, require_student, require_admin)
│   └── tests/
│       ├── test_eligibility.py
│       ├── test_encryption.py
│       └── test_auth.py
```

---

## Tech Stack — Backend

| Component | Choice | Reason |
|---|---|---|
| Framework | **FastAPI** | Async, typed, auto-docs (Swagger UI at `/docs`) |
| ORM | **SQLAlchemy 2 (async)** with `asyncpg` | Same DB as Prisma, full async support |
| Validation | **Pydantic v2** | Built into FastAPI, mirrors Zod patterns |
| Auth | **python-jose** (JWT decode) | Verify Auth.js JWTs without re-implementing OAuth |
| Encryption | **cryptography** (PyCA) | AES-256-GCM, port of `encryption.ts` |
| File uploads | **Cloudinary SDK** or **boto3** (S3) | Resume and document storage |
| Email | **resend** Python SDK | Match existing plan |
| Server | **Uvicorn** with **Gunicorn** | Production-grade ASGI |
| Testing | **pytest + httpx (AsyncClient)** | Async test client |

### `backend/requirements.txt`

```
fastapi>=0.115
uvicorn[standard]>=0.30
sqlalchemy[asyncio]>=2.0
asyncpg>=0.30
pydantic>=2.7
pydantic-settings>=2.3
python-jose[cryptography]>=3.3
cryptography>=43
python-multipart>=0.0.9
cloudinary>=1.40
resend>=2.0
httpx>=0.27
pytest>=8.0
pytest-asyncio>=0.23
```

---

## Core Modules

### `app/core/config.py`

```python
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    database_url: str                  # same as Next.js DATABASE_URL
    auth_secret: str                   # same as Next.js AUTH_SECRET
    encryption_key: str                # same as Next.js ENCRYPTION_KEY (64-char hex)
    cloudinary_cloud_name: str = ""
    cloudinary_api_key: str = ""
    cloudinary_api_secret: str = ""
    resend_api_key: str = ""
    email_from: str = "placements@iiitl.ac.in"
    cors_origins: list[str] = ["http://localhost:3000"]
    allowed_pdf_size_mb: int = 5

    class Config:
        env_file = "../.env"

settings = Settings()
```

---

### `app/core/security.py` — JWT verification

Auth.js signs JWTs with the `AUTH_SECRET`. FastAPI decodes and validates them without needing a separate secret exchange.

```python
from jose import jwt, JWTError
from fastapi import HTTPException, status, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

bearer = HTTPBearer()

def decode_token(token: str) -> dict:
    try:
        payload = jwt.decode(token, settings.auth_secret, algorithms=["HS256"])
        return payload
    except JWTError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")

async def require_student(creds: HTTPAuthorizationCredentials = Depends(bearer)) -> dict:
    payload = decode_token(creds.credentials)
    if payload.get("role") != "STUDENT":
        raise HTTPException(status_code=403, detail="Student access required")
    return payload

async def require_admin(creds: HTTPAuthorizationCredentials = Depends(bearer)) -> dict:
    payload = decode_token(creds.credentials)
    if payload.get("role") != "ADMIN":
        raise HTTPException(status_code=403, detail="Admin access required")
    return payload
```

---

### `app/core/encryption.py` — Port of `encryption.ts`

```python
import os, secrets
from cryptography.hazmat.primitives.ciphers.aead import AESGCM

def _get_key() -> bytes:
    key_hex = os.environ["ENCRYPTION_KEY"]
    assert len(key_hex) == 64, "ENCRYPTION_KEY must be 64-char hex"
    return bytes.fromhex(key_hex)

def encrypt_value(value: str) -> str:
    iv = secrets.token_bytes(12)
    aesgcm = AESGCM(_get_key())
    ct = aesgcm.encrypt(iv, value.encode(), None)
    tag = ct[-16:]
    data = ct[:-16]
    return f"{iv.hex()}:{tag.hex()}:{data.hex()}"

def decrypt_value(payload: str) -> str:
    iv_hex, tag_hex, data_hex = payload.split(":")
    iv, tag, data = bytes.fromhex(iv_hex), bytes.fromhex(tag_hex), bytes.fromhex(data_hex)
    aesgcm = AESGCM(_get_key())
    return aesgcm.decrypt(iv, data + tag, None).decode()
```

---

### `app/services/eligibility.py` — Port of `eligibility.ts`

```python
from dataclasses import dataclass

@dataclass
class EligibilityCheck:
    key: str
    label: str
    passed: bool

def evaluate_eligibility(
    cgpa, batch, branch, backlogs, bans, documents_complete,
    min_cgpa, job_batch, allowed_branches, max_backlogs, max_bans=0
) -> list[EligibilityCheck]:
    return [
        EligibilityCheck("cgpa",      f"CGPA {cgpa} >= {min_cgpa}",        cgpa >= min_cgpa),
        EligibilityCheck("batch",     f"Batch {batch}",                     batch == job_batch),
        EligibilityCheck("branch",    f"Branch {branch}",                   branch in allowed_branches),
        EligibilityCheck("backlogs",  f"Backlogs {backlogs} <= {max_backlogs}", backlogs <= max_backlogs),
        EligibilityCheck("bans",      f"Bans {bans} <= {max_bans}",         bans <= max_bans),
        EligibilityCheck("documents", "Profile documents complete",          documents_complete),
    ]

def is_eligible(checks: list[EligibilityCheck]) -> bool:
    return all(c.passed for c in checks)
```

---

## API Endpoints

All endpoints are prefixed with `/api/v1`. Next.js calls these from server components and server actions by forwarding the user's JWT.

### Authentication & Health

| Method | Path | Description | Auth |
|---|---|---|---|
| `GET` | `/api/health` | Health check | None |
| `GET` | `/api/v1/auth/me` | Return decoded token claims | Student or Admin |

---

### Student — Dashboard

| Method | Path | Description | Auth |
|---|---|---|---|
| `GET` | `/api/v1/dashboard` | Metrics, announcements, next deadline, eligible roles | Student |

---

### Student — Profile

| Method | Path | Description | Auth |
|---|---|---|---|
| `GET` | `/api/v1/profile` | Fetch own profile | Student |
| `PATCH` | `/api/v1/profile` | Update own profile fields | Student |
| `PUT` | `/api/v1/profile/aadhaar` | Save encrypted Aadhaar | Student |
| `PUT` | `/api/v1/profile/pan` | Save encrypted PAN | Student |
| `GET` | `/api/v1/profile/resumes` | List own resumes | Student |
| `DELETE` | `/api/v1/profile/resumes/{resume_id}` | Delete a resume | Student |

---

### Student — Company Events / Jobs

| Method | Path | Description | Auth |
|---|---|---|---|
| `GET` | `/api/v1/jobs` | List active jobs with eligibility check per student | Student |
| `GET` | `/api/v1/jobs/{job_id}` | Job detail with eligibility breakdown | Student |

---

### Student — Applications

| Method | Path | Description | Auth |
|---|---|---|---|
| `GET` | `/api/v1/applications` | List own applications with status timeline | Student |
| `POST` | `/api/v1/applications` | Apply to a job (eligibility re-checked server-side) | Student |
| `PATCH` | `/api/v1/applications/{application_id}/withdraw` | Withdraw application | Student |

---

### Student — Feedback

| Method | Path | Description | Auth |
|---|---|---|---|
| `GET` | `/api/v1/feedback` | List own feedback items | Student |
| `POST` | `/api/v1/feedback` | Submit new feedback/query/complaint | Student |

---

### Student — Forms / NOC

| Method | Path | Description | Auth |
|---|---|---|---|
| `GET` | `/api/v1/noc` | List own NOC requests | Student |
| `POST` | `/api/v1/noc` | Submit a new NOC request | Student |
| `PATCH` | `/api/v1/noc/{noc_id}/cancel` | Cancel a pending NOC request | Student |

---

### Student — Notifications

| Method | Path | Description | Auth |
|---|---|---|---|
| `GET` | `/api/v1/notifications` | List notifications (most recent first) | Student |
| `GET` | `/api/v1/notifications/unread-count` | Count of unread notifications | Student |
| `PATCH` | `/api/v1/notifications/{notification_id}/read` | Mark as read | Student |
| `PATCH` | `/api/v1/notifications/read-all` | Mark all as read | Student |

---

### Public — Team & Announcements

| Method | Path | Description | Auth |
|---|---|---|---|
| `GET` | `/api/v1/team` | List placement team members (public) | None |
| `GET` | `/api/v1/announcements` | List announcements | Student |

---

### Admin — Dashboard

| Method | Path | Description | Auth |
|---|---|---|---|
| `GET` | `/api/v1/admin/dashboard` | Totals, application funnel, branch placement | Admin |

---

### Admin — Companies

| Method | Path | Description | Auth |
|---|---|---|---|
| `GET` | `/api/v1/admin/companies` | List all companies with job counts | Admin |
| `POST` | `/api/v1/admin/companies` | Create a company | Admin |
| `PATCH` | `/api/v1/admin/companies/{company_id}` | Edit company details | Admin |
| `DELETE` | `/api/v1/admin/companies/{company_id}` | Delete (blocked if jobs exist) | Admin |

---

### Admin — Job Profiles

| Method | Path | Description | Auth |
|---|---|---|---|
| `GET` | `/api/v1/admin/jobs` | List all job profiles with filters | Admin |
| `POST` | `/api/v1/admin/jobs` | Create a job profile | Admin |
| `PATCH` | `/api/v1/admin/jobs/{job_id}` | Edit job profile | Admin |
| `PATCH` | `/api/v1/admin/jobs/{job_id}/status` | Change status (DRAFT/ACTIVE/ENDED) | Admin |
| `DELETE` | `/api/v1/admin/jobs/{job_id}` | Delete (blocked if applications exist) | Admin |

---

### Admin — Students

| Method | Path | Description | Auth |
|---|---|---|---|
| `GET` | `/api/v1/admin/students` | Searchable student directory | Admin |
| `GET` | `/api/v1/admin/students/{student_id}` | Student profile + applications | Admin |

---

### Admin — Applications

| Method | Path | Description | Auth |
|---|---|---|---|
| `GET` | `/api/v1/admin/applications` | All applications with filters | Admin |
| `PATCH` | `/api/v1/admin/applications/{application_id}/status` | Update application status | Admin |

---

### Admin — Feedback

| Method | Path | Description | Auth |
|---|---|---|---|
| `GET` | `/api/v1/admin/feedback` | List all feedback | Admin |
| `PATCH` | `/api/v1/admin/feedback/{feedback_id}/respond` | Respond and resolve | Admin |

---

### Admin — NOC Requests

| Method | Path | Description | Auth |
|---|---|---|---|
| `GET` | `/api/v1/admin/noc` | All NOC requests | Admin |
| `PATCH` | `/api/v1/admin/noc/{noc_id}/approve` | Approve request | Admin |
| `PATCH` | `/api/v1/admin/noc/{noc_id}/reject` | Reject with optional message | Admin |
| `PATCH` | `/api/v1/admin/noc/{noc_id}/document` | Set signed document URL | Admin |

---

### Admin — Announcements

| Method | Path | Description | Auth |
|---|---|---|---|
| `GET` | `/api/v1/admin/announcements` | List all announcements | Admin |
| `POST` | `/api/v1/admin/announcements` | Create announcement | Admin |
| `PATCH` | `/api/v1/admin/announcements/{announcement_id}` | Edit announcement | Admin |
| `DELETE` | `/api/v1/admin/announcements/{announcement_id}` | Delete announcement | Admin |

---

### Admin — Team Management

| Method | Path | Description | Auth |
|---|---|---|---|
| `GET` | `/api/v1/admin/team` | List team members | Admin |
| `POST` | `/api/v1/admin/team` | Add member | Admin |
| `PATCH` | `/api/v1/admin/team/{member_id}` | Edit member | Admin |
| `DELETE` | `/api/v1/admin/team/{member_id}` | Remove member | Admin |
| `PUT` | `/api/v1/admin/team/order` | Reorder members | Admin |

---

### File Uploads

| Method | Path | Description | Auth |
|---|---|---|---|
| `POST` | `/api/v1/uploads/resume` | Upload PDF resume (max 5MB) | Student |
| `POST` | `/api/v1/admin/uploads/noc-document` | Upload signed NOC PDF | Admin |

**Resume upload validation chain:**
1. Check `Content-Type: multipart/form-data`
2. Read file bytes, assert first 4 bytes = `%PDF`
3. Assert size <= 5MB
4. Assert MIME = `application/pdf`
5. Upload to Cloudinary, get secure URL
6. Insert `Resume` record: `{ user_id, label, file_url, file_name }`
7. Assert user has <= 5 resumes total

---

## Next.js Frontend Changes

### `src/lib/api-client.ts` — NEW

```typescript
// Thin wrapper that forwards the Auth.js session JWT to FastAPI
import { auth } from "@/lib/auth";

export async function backendFetch<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const session = await auth();
  const token = (session as any)?.accessToken;
  const res = await fetch(`${process.env.BACKEND_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}
```

> [!IMPORTANT]
> Auth.js does not expose the raw signed JWT to server components by default. The `jwt` callback in `src/lib/auth.ts` must be updated to attach the encoded token to the session object so `backendFetch` can forward it.

### Files to update in Next.js

| File | Change |
|---|---|
| `src/app/dashboard/page.tsx` | Replace `db.*` calls with `backendFetch('/api/v1/dashboard')` |
| `src/app/profile/actions.ts` | Replace Prisma update with `backendFetch('/api/v1/profile', { method: 'PATCH' })` |
| `src/app/company-events/actions.ts` | Replace `applyToJob` with `backendFetch('/api/v1/applications', { method: 'POST' })` |
| `src/app/applications/actions.ts` | Replace withdrawal with `backendFetch('/api/v1/applications/{id}/withdraw', { method: 'PATCH' })` |
| `src/app/feedback/actions.ts` | Replace `db.feedback.create` with `backendFetch('/api/v1/feedback', { method: 'POST' })` |
| `src/app/forms/actions.ts` | New file — calls `/api/v1/noc` |
| `src/app/admin/companies/actions.ts` | Replace Prisma with `/api/v1/admin/companies` |
| `src/app/admin/job-profiles/actions.ts` | Replace Prisma with `/api/v1/admin/jobs` |
| `src/app/admin/applications/actions.ts` | New — calls `/api/v1/admin/applications/{id}/status` |
| `src/app/admin/announcements/actions.ts` | New — calls `/api/v1/admin/announcements` |
| `src/app/admin/feedbacks/actions.ts` | New — calls `/api/v1/admin/feedback/{id}/respond` |
| `src/app/admin/noc-requests/actions.ts` | New — calls `/api/v1/admin/noc` |
| `src/app/admin/team/actions.ts` | New — calls `/api/v1/admin/team` |
| `src/lib/db.ts` | Remove from server action imports (Prisma only used by Auth.js adapter) |

---

## Docker Orchestration

### `backend/Dockerfile`

```dockerfile
FROM python:3.12-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

EXPOSE 8000
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
```

### Updated `docker-compose.yml`

```yaml
services:
  db:
    image: postgres:16-alpine
    environment:
      POSTGRES_DB: tnp_portal
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
    ports: ["5432:5432"]
    volumes: ["postgres_data:/var/lib/postgresql/data"]
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres -d tnp_portal"]
      interval: 5s
      timeout: 5s
      retries: 10

  backend:
    build: ./backend
    ports: ["8000:8000"]
    environment:
      DATABASE_URL: postgresql+asyncpg://postgres:postgres@db:5432/tnp_portal
      AUTH_SECRET: ${AUTH_SECRET}
      ENCRYPTION_KEY: ${ENCRYPTION_KEY}
      CORS_ORIGINS: '["http://localhost:3000"]'
    depends_on:
      db:
        condition: service_healthy

  app:
    build: .
    ports: ["3000:3000"]
    environment:
      DATABASE_URL: postgresql://postgres:postgres@db:5432/tnp_portal
      AUTH_SECRET: ${AUTH_SECRET}
      AUTH_GOOGLE_ID: ${AUTH_GOOGLE_ID:-}
      AUTH_GOOGLE_SECRET: ${AUTH_GOOGLE_SECRET:-}
      BACKEND_URL: http://backend:8000
    depends_on:
      db:
        condition: service_healthy
      backend:
        condition: service_started

volumes:
  postgres_data: {}
```

---

## New Environment Variables

Add to `.env.example`:

```env
# FastAPI backend URL (used by Next.js)
BACKEND_URL="http://localhost:8000"

# File storage
CLOUDINARY_CLOUD_NAME=""
CLOUDINARY_API_KEY=""
CLOUDINARY_API_SECRET=""

# Email
RESEND_API_KEY=""
EMAIL_FROM="placements@iiitl.ac.in"
```

---

## Execution Order

| Phase | Tasks |
|---|---|
| **1 — Foundation** | Create `backend/` structure, `requirements.txt`, `config.py`, `database.py`, `security.py`, SQLAlchemy models, `main.py` with CORS + health endpoint |
| **2 — Core Student APIs** | `/dashboard`, `/profile` (GET + PATCH), `/jobs`, `/applications` (GET + POST + withdraw). Port eligibility engine. Update Next.js to call FastAPI |
| **3 — Admin APIs** | All `/admin/*` routers: companies, jobs, students, applications, dashboard. Update Next.js admin pages |
| **4 — Identity & Encryption** | Port `encryption.ts` to `encryption.py`. Add `/profile/aadhaar` and `/profile/pan` endpoints |
| **5 — NOC & Feedback** | `/noc`, `/admin/noc`, `/feedback`, `/admin/feedback`. Update forms-view and admin feedback |
| **6 — Announcements & Team** | `/announcements`, `/admin/announcements`, `/team`, `/admin/team` |
| **7 — File Uploads** | `storage.py`, `/uploads/resume`, `/admin/uploads/noc-document`, PDF validation |
| **8 — Notifications & Email** | `email.py` (Resend), `notifications.py`, `/notifications` router, event hooks in status endpoints |
| **9 — Docker & CI** | Update `docker-compose.yml` with `backend` service, update GitHub Actions to run `pytest` |

---

## Verification Plan

### Automated tests

```bash
# FastAPI
cd backend && pytest tests/ -v

# Next.js (existing suite must still pass)
npm run lint && npm run type-check && npm test && npm run build
```

### Key test cases

| File | What it tests |
|---|---|
| `test_eligibility.py` | All 6 criteria checks, edge cases |
| `test_encryption.py` | Round-trip encrypt/decrypt, bad key rejected |
| `test_auth.py` | Valid JWT passes, expired JWT → 401, wrong role → 403 |
| `test_applications.py` | Apply success, duplicate rejected, eligibility failure |
| `test_profile.py` | PATCH validates fields, identity docs encrypted before save |

### Manual smoke tests
- FastAPI Swagger UI at `http://localhost:8000/docs` — all routes visible
- Student Google sign-in → dashboard loads via FastAPI
- Admin creates announcement → appears on student dashboard
- Student applies to job → appears in admin applications table
- Admin updates status → student tracker reflects change

---

## Open Questions

> [!IMPORTANT]
> **JWT forwarding**: Auth.js does not expose the raw signed JWT to server components by default. Do you want to keep Google OAuth + Auth.js for the frontend and forward the token to FastAPI, or would you prefer FastAPI to issue its own JWT after Auth.js creates the user?

> [!NOTE]
> **Database ownership**: Should FastAPI use its own Alembic migrations or treat Prisma as the sole migration owner? Recommendation: Prisma owns all migrations; FastAPI uses SQLAlchemy in read/write mode but never runs `metadata.create_all`.

> [!NOTE]
> **Storage provider**: Cloudinary or AWS S3? This unblocks resume upload, NOC document storage, and apply-flow resume association. Cloudinary is recommended for easier setup.
