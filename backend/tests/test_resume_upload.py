"""
Tests for the resume upload and delete endpoints.

Uses FastAPI TestClient with mocked storage (app.core.storage wrapper
functions) and DB, so no real Cloudinary credentials or database connection
are needed.
"""
from __future__ import annotations

import datetime
import io
import uuid
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from fastapi.testclient import TestClient

from app.core import security
from app.core.config import Settings

# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------

_PDF_MAGIC = b"%PDF-1.4 fake pdf content"
_NOT_PDF = b"This is definitely not a PDF file."
_STUDENT_SECRET = "test-secret"
_STUDENT_EMAIL = "student@iiitl.ac.in"
_STUDENT_ID = "user-abc-123"


# ---------------------------------------------------------------------------
# Settings / token helpers
# ---------------------------------------------------------------------------


def _student_settings() -> Settings:
    return Settings(
        admin_emails="",
        student_email_domain="iiitl.ac.in",
        auth_secret=_STUDENT_SECRET,
        cors_origins="http://localhost:3000",
        cloudinary_cloud_name="test",
        cloudinary_api_key="test",
        cloudinary_api_secret="test",
    )


def _student_token() -> str:
    from jose import jwt  # noqa: PLC0415

    return jwt.encode(
        {"sub": _STUDENT_ID, "email": _STUDENT_EMAIL, "role": "STUDENT"},
        _STUDENT_SECRET,
        algorithm="HS256",
    )


def _auth_header() -> dict[str, str]:
    return {"Authorization": f"Bearer {_student_token()}"}


def _fake_resume(resume_id: str = "my-resume-id", user_id: str = _STUDENT_ID):
    from app.models.db import Resume  # noqa: PLC0415

    return Resume(
        id=resume_id,
        userId=user_id,
        label="CV.pdf",
        fileUrl="https://res.cloudinary.com/test/raw/upload/test.pdf",
        fileName="CV.pdf",
        publicId=f"resumes/{user_id}/{resume_id}",
        uploadedAt=datetime.datetime.utcnow(),
    )


# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------


@pytest.fixture()
def client(monkeypatch):
    """
    Return a TestClient with:
    - security settings overridden so student JWT tokens verify correctly
    - storage module's Cloudinary calls patched out
    """
    test_settings = _student_settings()
    monkeypatch.setattr(security, "settings", test_settings)

    # Patch the cloudinary module that storage.py calls at import time.
    # We patch the *already-imported* cloudinary objects in the storage module
    # so the import-time configuration call is a no-op.
    with (
        patch("app.core.storage.cloudinary.config"),
        patch("app.core.storage.cloudinary.uploader.upload", return_value={
            "secure_url": "https://res.cloudinary.com/test/raw/upload/cv.pdf",
            "public_id": f"resumes/{_STUDENT_ID}/{uuid.uuid4()}",
            "bytes": len(_PDF_MAGIC),
        }),
        patch("app.core.storage.cloudinary.uploader.destroy", return_value={"result": "ok"}),
    ):
        from main import app  # noqa: PLC0415

        with TestClient(app, raise_server_exceptions=False) as c:
            yield c


def _override_db(client, *, scalar_return=0, scalars_return=None, resume_obj=None):
    """Install a lightweight async DB stub as a FastAPI dependency override."""
    from app.core.database import get_db  # noqa: PLC0415

    async def _fake_db():
        db = AsyncMock()
        db.scalar = AsyncMock(
            return_value=resume_obj if resume_obj is not None else scalar_return
        )
        if scalars_return is not None:
            result_mock = MagicMock()
            result_mock.all.return_value = scalars_return
            db.scalars = AsyncMock(return_value=result_mock)

        async def _refresh(r):
            if not getattr(r, "uploadedAt", None):
                r.uploadedAt = datetime.datetime.utcnow()

        db.add = MagicMock()
        db.commit = AsyncMock()
        db.refresh = AsyncMock(side_effect=_refresh)
        db.delete = AsyncMock()
        yield db

    client.app.dependency_overrides[get_db] = _fake_db  # type: ignore[attr-defined]


# ---------------------------------------------------------------------------
# POST /api/v1/uploads/resume
# ---------------------------------------------------------------------------


class TestUploadResumeEndpoint:
    def test_unauthenticated_request_is_rejected(self, client):
        res = client.post("/api/v1/uploads/resume")
        assert res.status_code in (401, 403)

    def test_valid_pdf_upload_succeeds(self, client):
        _override_db(client, scalar_return=0)
        res = client.post(
            "/api/v1/uploads/resume",
            headers=_auth_header(),
            files={"file": ("cv.pdf", io.BytesIO(_PDF_MAGIC), "application/pdf")},
        )
        assert res.status_code == 200, res.text
        body = res.json()
        assert "id" in body
        assert "fileUrl" in body

    def test_non_pdf_content_type_is_rejected(self, client):
        _override_db(client, scalar_return=0)
        res = client.post(
            "/api/v1/uploads/resume",
            headers=_auth_header(),
            files={"file": ("cv.txt", io.BytesIO(b"not a pdf"), "text/plain")},
        )
        assert res.status_code == 400
        assert "pdf" in res.json()["detail"].lower()

    def test_empty_file_is_rejected(self, client):
        _override_db(client, scalar_return=0)
        res = client.post(
            "/api/v1/uploads/resume",
            headers=_auth_header(),
            files={"file": ("empty.pdf", io.BytesIO(b""), "application/pdf")},
        )
        assert res.status_code == 400

    def test_invalid_pdf_bytes_are_rejected(self, client):
        """Content-type says PDF but magic bytes are wrong → 400."""
        _override_db(client, scalar_return=0)
        res = client.post(
            "/api/v1/uploads/resume",
            headers=_auth_header(),
            files={"file": ("fake.pdf", io.BytesIO(_NOT_PDF), "application/pdf")},
        )
        assert res.status_code == 400
        assert "pdf" in res.json()["detail"].lower()

    def test_oversized_file_is_rejected(self, client):
        _override_db(client, scalar_return=0)
        # 6 MB > 5 MB limit; size check runs before magic-byte validation
        big = b"%PDF" + b"x" * (6 * 1024 * 1024)
        res = client.post(
            "/api/v1/uploads/resume",
            headers=_auth_header(),
            files={"file": ("big.pdf", io.BytesIO(big), "application/pdf")},
        )
        assert res.status_code == 400
        detail = res.json()["detail"].lower()
        assert any(word in detail for word in ("mb", "limit", "exceed"))

    def test_per_student_limit_is_enforced(self, client):
        # Default max is 5; return 5 existing resumes
        _override_db(client, scalar_return=5)
        res = client.post(
            "/api/v1/uploads/resume",
            headers=_auth_header(),
            files={"file": ("cv.pdf", io.BytesIO(_PDF_MAGIC), "application/pdf")},
        )
        assert res.status_code == 400
        detail = res.json()["detail"].lower()
        assert "maximum" in detail or "limit" in detail


# ---------------------------------------------------------------------------
# DELETE /api/v1/profile/resumes/{resume_id}
# ---------------------------------------------------------------------------


class TestDeleteResumeEndpoint:
    def test_unauthenticated_request_is_rejected(self, client):
        res = client.delete("/api/v1/profile/resumes/some-id")
        assert res.status_code in (401, 403)

    def test_student_cannot_delete_another_students_resume(self, client):
        """When the ownership filter returns None → 404."""
        _override_db(client, resume_obj=None)
        res = client.delete(
            "/api/v1/profile/resumes/other-users-resume-id",
            headers=_auth_header(),
        )
        assert res.status_code == 404

    def test_valid_delete_returns_200(self, client):
        resume = _fake_resume()
        _override_db(client, resume_obj=resume)
        res = client.delete(
            f"/api/v1/profile/resumes/{resume.id}",
            headers=_auth_header(),
        )
        assert res.status_code == 200
        assert res.json()["message"] == "Resume deleted"


# ---------------------------------------------------------------------------
# GET /api/v1/profile/resumes
# ---------------------------------------------------------------------------


class TestListResumesEndpoint:
    def test_unauthenticated_request_is_rejected(self, client):
        res = client.get("/api/v1/profile/resumes")
        assert res.status_code in (401, 403)

    def test_returns_own_resumes(self, client):
        own = _fake_resume()
        _override_db(client, scalars_return=[own])
        res = client.get("/api/v1/profile/resumes", headers=_auth_header())
        assert res.status_code == 200
        body = res.json()
        assert isinstance(body, list)
        assert len(body) == 1
        assert body[0]["id"] == own.id

    def test_returns_empty_list_when_no_resumes(self, client):
        _override_db(client, scalars_return=[])
        res = client.get("/api/v1/profile/resumes", headers=_auth_header())
        assert res.status_code == 200
        assert res.json() == []
