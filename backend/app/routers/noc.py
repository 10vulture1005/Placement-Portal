from __future__ import annotations

import uuid
from datetime import datetime, timezone
from typing import Optional
from fastapi import APIRouter, BackgroundTasks, Depends, File, HTTPException, Query, UploadFile, status
from sqlalchemy import func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.security import PERM_NOC_MANAGE, get_current_user, require_permission
from app.core.storage import upload_pdf, validate_pdf
from app.dependencies import get_db, require_student
from app.models.db import NocRequest, NocStatus, Notification, User
from app.schemas.noc import (
    AdminNocResponse,
    NocApproveRequest,
    NocCreate,
    NocMetricsResponse,
    NocRejectRequest,
    NocResponse,
    NocStudentSummary,
)
from app.services.email import send_notification_email

router = APIRouter(prefix="/noc", tags=["noc"])


def _to_admin_noc_response(noc: NocRequest) -> AdminNocResponse:
    student_summary = None
    if noc.user:
        student_summary = NocStudentSummary(
            id=noc.user.id,
            name=noc.user.name,
            email=noc.user.email,
            rollNumber=noc.user.rollNumber,
            branch=noc.user.branch,
            batch=noc.user.batch,
            cgpa=noc.user.cgpa,
            contactNumber=noc.user.contactNumber,
        )

    status_val = noc.status.value if hasattr(noc.status, "value") else str(noc.status)

    return AdminNocResponse(
        id=noc.id,
        userId=noc.userId,
        company=noc.company,
        address=noc.address,
        city=noc.city,
        state=noc.state,
        pincode=noc.pincode,
        startDate=noc.startDate,
        endDate=noc.endDate,
        status=status_val,
        message=noc.message,
        documentUrl=noc.documentUrl,
        createdAt=noc.createdAt,
        updatedAt=noc.updatedAt,
        student=student_summary,
    )


# ===========================================================================
# Student Endpoints
# ===========================================================================

@router.get("", response_model=list[NocResponse])
async def list_nocs(
    user_payload: dict = Depends(require_student),
    db: AsyncSession = Depends(get_db),
):
    """List all NOC requests submitted by the calling student."""
    nocs = await db.scalars(
        select(NocRequest)
        .where(NocRequest.userId == user_payload["sub"])
        .order_by(NocRequest.createdAt.desc())
    )
    return nocs.all()


@router.post("", response_model=NocResponse)
async def create_noc(
    data: NocCreate,
    user_payload: dict = Depends(require_student),
    db: AsyncSession = Depends(get_db),
):
    """Submit a new NOC request."""
    noc = NocRequest(
        id=str(uuid.uuid4()),
        userId=user_payload["sub"],
        company=data.company.strip(),
        address=data.address.strip(),
        city=data.city.strip(),
        state=data.state.strip(),
        pincode=data.pincode.strip(),
        startDate=data.startDate,
        endDate=data.endDate,
        status=NocStatus.PENDING,
        message=data.message.strip() if data.message else None,
    )
    db.add(noc)
    await db.commit()
    await db.refresh(noc)
    return noc


@router.patch("/{noc_id}/cancel")
async def cancel_noc(
    noc_id: str,
    user_payload: dict = Depends(require_student),
    db: AsyncSession = Depends(get_db),
):
    """Cancel a pending NOC request."""
    noc = await db.scalar(
        select(NocRequest).where(
            NocRequest.id == noc_id,
            NocRequest.userId == user_payload["sub"],
        )
    )
    if not noc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="NOC request not found.")

    if noc.status != NocStatus.PENDING:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only pending NOC requests can be cancelled.",
        )

    await db.delete(noc)
    await db.commit()
    return {"message": "NOC request cancelled successfully."}


# ===========================================================================
# Administrative Endpoints (Protected by PERM_NOC_MANAGE)
# ===========================================================================

@router.get("/admin/metrics", response_model=NocMetricsResponse)
async def get_noc_metrics(
    admin_payload: dict = Depends(require_permission(PERM_NOC_MANAGE)),
    db: AsyncSession = Depends(get_db),
):
    """Retrieve NOC summary metrics for admin dashboard."""
    total = await db.scalar(select(func.count(NocRequest.id))) or 0
    pending = await db.scalar(
        select(func.count(NocRequest.id)).where(NocRequest.status == NocStatus.PENDING)
    ) or 0
    approved = await db.scalar(
        select(func.count(NocRequest.id)).where(NocRequest.status == NocStatus.APPROVED)
    ) or 0
    rejected = await db.scalar(
        select(func.count(NocRequest.id)).where(NocRequest.status == NocStatus.REJECTED)
    ) or 0

    return NocMetricsResponse(
        total=total,
        pending=pending,
        approved=approved,
        rejected=rejected,
    )


@router.get("/admin", response_model=list[AdminNocResponse])
async def list_admin_nocs(
    status_filter: Optional[str] = Query(None, description="Filter by status (PENDING, APPROVED, REJECTED)"),
    search: Optional[str] = Query(None, description="Search across student name, roll number, company, city"),
    limit: int = Query(100, ge=1, le=500),
    offset: int = Query(0, ge=0),
    admin_payload: dict = Depends(require_permission(PERM_NOC_MANAGE)),
    db: AsyncSession = Depends(get_db),
):
    """List all student NOC requests with filters, search, and student profile info."""
    stmt = (
        select(NocRequest)
        .options(selectinload(NocRequest.user))
        .order_by(NocRequest.createdAt.desc())
    )

    if status_filter:
        norm_status = status_filter.strip().upper()
        try:
            enum_status = NocStatus(norm_status)
            stmt = stmt.where(NocRequest.status == enum_status)
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid status '{status_filter}'. Allowed: {[s.value for s in NocStatus]}",
            )

    if search:
        term = f"%{search.strip().lower()}%"
        stmt = stmt.join(NocRequest.user).where(
            or_(
                func.lower(NocRequest.company).like(term),
                func.lower(NocRequest.city).like(term),
                func.lower(NocRequest.state).like(term),
                func.lower(User.name).like(term),
                func.lower(User.email).like(term),
                func.lower(User.rollNumber).like(term),
            )
        )

    stmt = stmt.offset(offset).limit(limit)
    result = await db.scalars(stmt)
    records = result.all()

    return [_to_admin_noc_response(noc) for noc in records]


@router.get("/admin/{noc_id}", response_model=AdminNocResponse)
async def get_admin_noc_detail(
    noc_id: str,
    admin_payload: dict = Depends(require_permission(PERM_NOC_MANAGE)),
    db: AsyncSession = Depends(get_db),
):
    """Retrieve detailed information about a single NOC request."""
    stmt = select(NocRequest).options(selectinload(NocRequest.user)).where(NocRequest.id == noc_id)
    noc = await db.scalar(stmt)
    if not noc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="NOC request not found.")

    return _to_admin_noc_response(noc)


@router.post("/admin/{noc_id}/approve", response_model=AdminNocResponse)
async def approve_noc(
    noc_id: str,
    data: NocApproveRequest,
    background_tasks: BackgroundTasks,
    admin_payload: dict = Depends(require_permission(PERM_NOC_MANAGE)),
    db: AsyncSession = Depends(get_db),
):
    """Approve a student NOC request, attach document URL or remarks, and notify student."""
    stmt = select(NocRequest).options(selectinload(NocRequest.user)).where(NocRequest.id == noc_id)
    noc = await db.scalar(stmt)
    if not noc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="NOC request not found.")

    noc.status = NocStatus.APPROVED
    if data.message is not None:
        noc.message = data.message.strip() if data.message.strip() else None
    if data.documentUrl is not None:
        noc.documentUrl = data.documentUrl.strip() if data.documentUrl.strip() else None
    noc.updatedAt = datetime.now(timezone.utc)

    # In-app notification for the student
    notif = Notification(
        id=str(uuid.uuid4()),
        userId=noc.userId,
        title="NOC Request Approved",
        message=f"Your NOC request for training at {noc.company} has been approved.",
        link="/forms",
    )
    db.add(notif)
    await db.commit()
    await db.refresh(noc)

    # Non-blocking background email
    if noc.user and noc.user.email:
        background_tasks.add_task(
            send_notification_email,
            to_email=noc.user.email,
            subject=f"NOC Request Approved: {noc.company}",
            message=(
                f"Hello {noc.user.name or 'Student'},\n\n"
                f"Your No Objection Certificate (NOC) request for internship/training at {noc.company} "
                f"has been approved by the Placement Cell.\n\n"
                f"Training Period: {noc.startDate.strftime('%d %b %Y')} to {noc.endDate.strftime('%d %b %Y')}\n\n"
                f"Please visit the portal to view the decision and download your certificate."
            ),
        )

    return _to_admin_noc_response(noc)


@router.post("/admin/{noc_id}/reject", response_model=AdminNocResponse)
async def reject_noc(
    noc_id: str,
    data: NocRejectRequest,
    background_tasks: BackgroundTasks,
    admin_payload: dict = Depends(require_permission(PERM_NOC_MANAGE)),
    db: AsyncSession = Depends(get_db),
):
    """Reject a student NOC request with a reason and notify student."""
    stmt = select(NocRequest).options(selectinload(NocRequest.user)).where(NocRequest.id == noc_id)
    noc = await db.scalar(stmt)
    if not noc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="NOC request not found.")

    noc.status = NocStatus.REJECTED
    if data.message:
        noc.message = data.message.strip()
    noc.updatedAt = datetime.now(timezone.utc)

    reason_text = f" Reason: {noc.message}" if noc.message else ""

    # In-app notification for the student
    notif = Notification(
        id=str(uuid.uuid4()),
        userId=noc.userId,
        title="NOC Request Rejected",
        message=f"Your NOC request for {noc.company} was not approved.{reason_text}",
        link="/forms",
    )
    db.add(notif)
    await db.commit()
    await db.refresh(noc)

    # Non-blocking background email
    if noc.user and noc.user.email:
        background_tasks.add_task(
            send_notification_email,
            to_email=noc.user.email,
            subject=f"NOC Request Update: {noc.company}",
            message=(
                f"Hello {noc.user.name or 'Student'},\n\n"
                f"Your No Objection Certificate (NOC) request for {noc.company} has been reviewed "
                f"and rejected by the Placement Cell.\n\n"
                f"{'Remarks: ' + noc.message if noc.message else ''}\n\n"
                f"Please contact the Placement Cell or submit feedback if you have any questions."
            ),
        )

    return _to_admin_noc_response(noc)


@router.post("/admin/{noc_id}/document")
async def upload_signed_noc_document(
    noc_id: str,
    file: UploadFile = File(...),
    admin_payload: dict = Depends(require_permission(PERM_NOC_MANAGE)),
    db: AsyncSession = Depends(get_db),
):
    """Upload signed NOC certificate PDF and attach directly to request."""
    stmt = select(NocRequest).options(selectinload(NocRequest.user)).where(NocRequest.id == noc_id)
    noc = await db.scalar(stmt)
    if not noc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="NOC request not found.")

    content = await file.read()
    try:
        validate_pdf(content)
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))

    upload_res = upload_pdf(content, folder="noc_docs", public_id=f"noc_{noc.id}")
    noc.documentUrl = upload_res["secure_url"]
    noc.updatedAt = datetime.now(timezone.utc)
    await db.commit()
    await db.refresh(noc)

    return {"url": noc.documentUrl, "noc": _to_admin_noc_response(noc)}

