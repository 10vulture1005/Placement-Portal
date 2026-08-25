"""
Resume upload endpoints.

POST /uploads/resume  — student uploads their own PDF resume
POST /uploads/admin/noc-document — admin uploads a NOC PDF
"""
from __future__ import annotations

import re
import uuid

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from typing import Optional
import uuid
from fastapi import APIRouter, Depends, Form, HTTPException, UploadFile, File
from fastapi.responses import FileResponse
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.storage import StorageError, validate_pdf, upload_pdf, delete_file
from app.dependencies import get_db, require_admin, require_student
from app.core.security import (
    PERM_APPLICATIONS_READ,
    PERM_STUDENTS_READ,
    has_permission,
    is_admin_email,
    is_elevated_role,
)
from app.core.storage import get_local_file_path, upload_pdf, validate_pdf
from app.dependencies import get_current_user, get_db, require_admin, require_student
from app.models.db import NocRequest, Resume
from app.schemas.student import ResumeResponse

router = APIRouter(prefix="/uploads", tags=["uploads"])


@router.post("/resume", response_model=ResumeResponse)
async def upload_resume(
    file: UploadFile = File(...),
    label: Optional[str] = Form(None),
    user_payload: dict = Depends(require_student),
    db: AsyncSession = Depends(get_db),
):
    # Check limits
    count = await db.scalar(
        select(func.count(Resume.id)).where(Resume.userId == user_payload["sub"])
    )
    if count and count >= settings.max_resumes_per_student:
        raise HTTPException(
            status_code=400,
            detail=f"Maximum resumes limit reached ({settings.max_resumes_per_student}).",
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
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

    # Upload to Cloudinary or local disk
    result = upload_pdf(
        content,
        folder=f"resumes/{user_payload['sub']}",
        public_id=str(uuid.uuid4()),
    )

    resume_label = (label or "").strip() or file.filename or "Resume"
    resume = Resume(
        id=str(uuid.uuid4()),
        userId=user_payload["sub"],
        label=resume_label,
        fileUrl=result["secure_url"],
        fileName=file.filename or "Resume.pdf",
    )
    db.add(resume)
    await db.commit()
    await db.refresh(resume)

    return resume


@router.post("/admin/noc-document")
async def upload_noc_document(
    file: UploadFile = File(...),
    admin_payload: dict = Depends(require_admin),
):
    content = await file.read()
    if len(content) == 0:
        raise HTTPException(status_code=400, detail="The uploaded file is empty.")

    try:
        validate_pdf(content)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

    result = upload_pdf(content, folder="noc_docs", public_id=str(uuid.uuid4()))
    return {"url": result["secure_url"]}


@router.get("/files/{file_path:path}")
async def get_uploaded_file(
    file_path: str,
    token_payload: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    user_id = token_payload.get("sub")
    user_role = token_payload.get("role")
    user_email = token_payload.get("email", "")
    is_admin = (
        is_elevated_role(user_role)
        or is_admin_email(user_email)
        or has_permission(token_payload, PERM_STUDENTS_READ)
        or has_permission(token_payload, PERM_APPLICATIONS_READ)
    )

    clean_path = file_path.lstrip("/")
    if ".." in clean_path or "\\" in clean_path:
        raise HTTPException(status_code=400, detail="Invalid path characters.")

    local_path = get_local_file_path(clean_path)
    if not local_path:
        raise HTTPException(status_code=404, detail="File not found.")

    # Security: Non-admin students can only access files in their own folder or their own NOC documents
    if not is_admin:
        from app.core.storage import LOCAL_UPLOADS_DIR
        try:
            resolved_rel = str(local_path.relative_to(LOCAL_UPLOADS_DIR.resolve()))
            is_own_resume = resolved_rel.startswith(f"resumes/{user_id}/")
            is_noc_doc = False
            if resolved_rel.startswith("noc_docs/"):
                doc_record = await db.scalar(
                    select(NocRequest).where(
                        NocRequest.userId == user_id,
                        NocRequest.documentUrl.is_not(None),
                    )
                )
                if doc_record and doc_record.documentUrl and resolved_rel in doc_record.documentUrl:
                    is_noc_doc = True

            if not (is_own_resume or is_noc_doc):
                raise HTTPException(status_code=403, detail="Not authorized to access this file.")
        except ValueError:
            raise HTTPException(status_code=403, detail="Not authorized to access this file.")

    return FileResponse(
        path=local_path,
        media_type="application/pdf",
        headers={"Content-Disposition": "inline; filename=document.pdf"},
    )


