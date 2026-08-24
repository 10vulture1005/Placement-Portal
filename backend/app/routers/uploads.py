"""
Resume upload endpoints.

POST /uploads/resume  — student uploads their own PDF resume
POST /uploads/admin/noc-document — admin uploads a NOC PDF
"""
from __future__ import annotations

import re
import uuid

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.storage import StorageError, validate_pdf, upload_pdf, delete_file
from app.dependencies import get_db, require_admin, require_student
from app.models.db import Resume
from app.schemas.student import ResumeResponse

router = APIRouter(prefix="/uploads", tags=["uploads"])

# Characters that are safe in a stored filename
_SAFE_NAME_RE = re.compile(r"[^\w\s.\-]", re.ASCII)

MAX_RESUME_BYTES = settings.allowed_pdf_size_mb * 1024 * 1024


def _sanitize_filename(name: str | None) -> str:
    """Return a filesystem-safe version of the uploaded filename."""
    if not name:
        return "resume.pdf"
    # Strip path separators and control characters
    base = name.split("/")[-1].split("\\")[-1].strip()
    safe = _SAFE_NAME_RE.sub("_", base)
    return safe or "resume.pdf"


@router.post("/resume", response_model=ResumeResponse)
async def upload_resume(
    file: UploadFile = File(...),
    user_payload: dict = Depends(require_student),
    db: AsyncSession = Depends(get_db),
):
    """
    Upload a PDF resume for the authenticated student.

    Enforces:
    - PDF magic-byte validation (not just file extension)
    - Maximum file size (settings.allowed_pdf_size_mb, default 5 MB)
    - Per-student resume limit (settings.max_resumes_per_student, default 5)
    - Ownership: the resume is always linked to the calling user
    """
    user_id: str = user_payload["sub"]

    # Guard: per-student limit
    count = await db.scalar(
        select(func.count(Resume.id)).where(Resume.userId == user_id)
    )
    if count is not None and count >= settings.max_resumes_per_student:
        raise HTTPException(
            status_code=400,
            detail=f"You have reached the maximum of {settings.max_resumes_per_student} resumes. "
                   "Delete an existing resume before uploading a new one.",
        )

    # Guard: basic content-type hint (browser-supplied, not trusted alone)
    if file.content_type and file.content_type not in (
        "application/pdf",
        "application/octet-stream",
    ):
        raise HTTPException(
            status_code=400,
            detail="Only PDF files are accepted.",
        )

    # Read the entire body — size validation happens inside validate_pdf
    content = await file.read()
    if len(content) == 0:
        raise HTTPException(status_code=400, detail="The uploaded file is empty.")
    if len(content) > MAX_RESUME_BYTES:
        raise HTTPException(
            status_code=400,
            detail=f"File exceeds the {settings.allowed_pdf_size_mb} MB limit. "
                   f"Received {len(content) / (1024 * 1024):.1f} MB.",
        )

    # PDF magic-byte validation (not trusting extension or content-type)
    try:
        validate_pdf(content)
    except StorageError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    safe_name = _sanitize_filename(file.filename)
    label = safe_name  # displayed in the UI; user can rename later if needed
    public_id = str(uuid.uuid4())

    # Upload to Cloudinary
    try:
        result = upload_pdf(
            content,
            folder=f"resumes/{user_id}",
            public_id=public_id,
        )
    except Exception as exc:
        raise HTTPException(
            status_code=502,
            detail="File storage failed. Please try again.",
        ) from exc

    resume = Resume(
        id=str(uuid.uuid4()),
        userId=user_id,
        label=label,
        fileUrl=result["secure_url"],
        fileName=safe_name,
        publicId=result.get("public_id") or f"resumes/{user_id}/{public_id}",
    )
    db.add(resume)
    try:
        await db.commit()
        await db.refresh(resume)
    except Exception as exc:
        # Attempt to clean up the already-uploaded asset so storage stays consistent
        try:
            delete_file(resume.publicId)
        except Exception:
            pass
        raise HTTPException(
            status_code=500,
            detail="Database error while saving resume metadata.",
        ) from exc

    return resume


@router.post("/admin/noc-document")
async def upload_noc_document(
    file: UploadFile = File(...),
    admin_payload: dict = Depends(require_admin),
):
    """Upload a NOC document (admin only). Returns the Cloudinary URL."""
    content = await file.read()
    if len(content) == 0:
        raise HTTPException(status_code=400, detail="The uploaded file is empty.")

    try:
        validate_pdf(content)
    except StorageError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    try:
        result = upload_pdf(content, folder="noc_docs", public_id=str(uuid.uuid4()))
    except Exception as exc:
        raise HTTPException(status_code=502, detail="File storage failed.") from exc

    return {"url": result["secure_url"]}
