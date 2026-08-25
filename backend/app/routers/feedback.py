from __future__ import annotations

import json
import uuid
from datetime import datetime, timezone
from typing import Optional
from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Query, status
from sqlalchemy import func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.security import PERM_FEEDBACKS_MANAGE, get_current_user, require_permission
from app.dependencies import get_db, require_student
from app.models.db import Feedback, FeedbackType, Notification, User
from app.schemas.feedback import (
    AdminFeedbackResponse,
    FeedbackCreate,
    FeedbackMetricsResponse,
    FeedbackReplyRequest,
    FeedbackResponse,
    FeedbackStudentSummary,
)
from app.services.email import send_notification_email

router = APIRouter(prefix="/feedback", tags=["feedback"])


def _read_content(raw_content: str) -> tuple[str, str]:
    """Parse JSON structure {subject, message} or fallback to raw content string."""
    try:
        data = json.loads(raw_content)
        if isinstance(data, dict):
            subject = str(data.get("subject") or "").strip()
            message = str(data.get("message") or "").strip()
            if subject or message:
                return subject or message[:60], message or subject
    except Exception:
        pass
    return raw_content[:60], raw_content


def _to_feedback_response(fb: Feedback) -> FeedbackResponse:
    type_val = fb.feedbackType.value if hasattr(fb.feedbackType, "value") else str(fb.feedbackType)
    subject, message = _read_content(fb.content)
    return FeedbackResponse(
        id=fb.id,
        userId=fb.userId,
        feedbackType=type_val,
        content=fb.content,
        resolved=fb.resolved,
        adminResponse=fb.adminResponse,
        createdAt=fb.createdAt,
        resolvedAt=fb.resolvedAt,
        subject=subject,
        message=message,
    )


def _to_admin_feedback_response(fb: Feedback) -> AdminFeedbackResponse:
    type_val = fb.feedbackType.value if hasattr(fb.feedbackType, "value") else str(fb.feedbackType)
    subject, message = _read_content(fb.content)

    student_summary = None
    if fb.user:
        student_summary = FeedbackStudentSummary(
            id=fb.user.id,
            name=fb.user.name,
            email=fb.user.email,
            rollNumber=fb.user.rollNumber,
            branch=fb.user.branch,
            batch=fb.user.batch,
            contactNumber=fb.user.contactNumber,
        )

    return AdminFeedbackResponse(
        id=fb.id,
        userId=fb.userId,
        feedbackType=type_val,
        content=fb.content,
        resolved=fb.resolved,
        adminResponse=fb.adminResponse,
        createdAt=fb.createdAt,
        resolvedAt=fb.resolvedAt,
        subject=subject,
        message=message,
        student=student_summary,
    )


# ===========================================================================
# Student Endpoints
# ===========================================================================

@router.get("", response_model=list[FeedbackResponse])
async def list_feedback(
    user_payload: dict = Depends(require_student),
    db: AsyncSession = Depends(get_db),
):
    """List all feedback, queries, and complaints submitted by the calling student."""
    feedbacks = await db.scalars(
        select(Feedback)
        .where(Feedback.userId == user_payload["sub"])
        .order_by(Feedback.createdAt.desc())
    )
    return [_to_feedback_response(fb) for fb in feedbacks.all()]


@router.post("", response_model=FeedbackResponse)
async def submit_feedback(
    data: FeedbackCreate,
    user_payload: dict = Depends(require_student),
    db: AsyncSession = Depends(get_db),
):
    """Submit a new feedback item, query, or complaint."""
    norm_type = data.feedbackType.strip().upper()
    try:
        type_enum = FeedbackType(norm_type)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid feedbackType '{data.feedbackType}'. Allowed: {[t.value for t in FeedbackType]}",
        )

    fb = Feedback(
        id=str(uuid.uuid4()),
        userId=user_payload["sub"],
        feedbackType=type_enum,
        content=data.content.strip(),
        resolved=False,
    )
    db.add(fb)
    await db.commit()
    await db.refresh(fb)
    return _to_feedback_response(fb)


# ===========================================================================
# Administrative Endpoints (Protected by PERM_FEEDBACKS_MANAGE)
# ===========================================================================

@router.get("/admin/metrics", response_model=FeedbackMetricsResponse)
async def get_feedback_metrics(
    admin_payload: dict = Depends(require_permission(PERM_FEEDBACKS_MANAGE)),
    db: AsyncSession = Depends(get_db),
):
    """Retrieve feedback summary metrics for admin dashboard."""
    total = await db.scalar(select(func.count(Feedback.id))) or 0
    pending = await db.scalar(
        select(func.count(Feedback.id)).where(Feedback.resolved == False)
    ) or 0
    resolved = await db.scalar(
        select(func.count(Feedback.id)).where(Feedback.resolved == True)
    ) or 0
    queries = await db.scalar(
        select(func.count(Feedback.id)).where(Feedback.feedbackType == FeedbackType.QUERY)
    ) or 0
    feedback_count = await db.scalar(
        select(func.count(Feedback.id)).where(Feedback.feedbackType == FeedbackType.FEEDBACK)
    ) or 0
    complaints = await db.scalar(
        select(func.count(Feedback.id)).where(Feedback.feedbackType == FeedbackType.COMPLAINT)
    ) or 0

    return FeedbackMetricsResponse(
        total=total,
        pending=pending,
        resolved=resolved,
        queries=queries,
        feedback=feedback_count,
        complaints=complaints,
    )


@router.get("/admin", response_model=list[AdminFeedbackResponse])
async def list_admin_feedbacks(
    status_filter: Optional[str] = Query(None, description="Filter by resolution status (PENDING, RESOLVED)"),
    type_filter: Optional[str] = Query(None, description="Filter by type (QUERY, FEEDBACK, COMPLAINT)"),
    search: Optional[str] = Query(None, description="Search across student name, email, roll number, or message"),
    limit: int = Query(100, ge=1, le=500),
    offset: int = Query(0, ge=0),
    admin_payload: dict = Depends(require_permission(PERM_FEEDBACKS_MANAGE)),
    db: AsyncSession = Depends(get_db),
):
    """List all student feedback submissions with filtering, search, and student profile info."""
    stmt = (
        select(Feedback)
        .options(selectinload(Feedback.user))
        .order_by(Feedback.createdAt.desc())
    )

    if status_filter:
        norm = status_filter.strip().upper()
        if norm == "PENDING":
            stmt = stmt.where(Feedback.resolved == False)
        elif norm == "RESOLVED":
            stmt = stmt.where(Feedback.resolved == True)

    if type_filter:
        norm_type = type_filter.strip().upper()
        try:
            type_enum = FeedbackType(norm_type)
            stmt = stmt.where(Feedback.feedbackType == type_enum)
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid type_filter '{type_filter}'. Allowed: {[t.value for t in FeedbackType]}",
            )

    if search:
        term = f"%{search.strip().lower()}%"
        stmt = stmt.join(Feedback.user).where(
            or_(
                func.lower(Feedback.content).like(term),
                func.lower(Feedback.adminResponse).like(term),
                func.lower(User.name).like(term),
                func.lower(User.email).like(term),
                func.lower(User.rollNumber).like(term),
            )
        )

    stmt = stmt.offset(offset).limit(limit)
    result = await db.scalars(stmt)
    records = result.all()

    return [_to_admin_feedback_response(fb) for fb in records]


@router.get("/admin/{feedback_id}", response_model=AdminFeedbackResponse)
async def get_admin_feedback_detail(
    feedback_id: str,
    admin_payload: dict = Depends(require_permission(PERM_FEEDBACKS_MANAGE)),
    db: AsyncSession = Depends(get_db),
):
    """Retrieve detailed information about a single feedback item."""
    stmt = select(Feedback).options(selectinload(Feedback.user)).where(Feedback.id == feedback_id)
    fb = await db.scalar(stmt)
    if not fb:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Feedback item not found.")

    return _to_admin_feedback_response(fb)


@router.post("/admin/{feedback_id}/respond", response_model=AdminFeedbackResponse)
async def respond_to_feedback(
    feedback_id: str,
    data: FeedbackReplyRequest,
    background_tasks: BackgroundTasks,
    admin_payload: dict = Depends(require_permission(PERM_FEEDBACKS_MANAGE)),
    db: AsyncSession = Depends(get_db),
):
    """Respond to a student query or feedback and optionally mark it resolved."""
    stmt = select(Feedback).options(selectinload(Feedback.user)).where(Feedback.id == feedback_id)
    fb = await db.scalar(stmt)
    if not fb:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Feedback item not found.")

    fb.adminResponse = data.adminResponse.strip()
    if data.resolve:
        fb.resolved = True
        fb.resolvedAt = datetime.now(timezone.utc)

    # In-app notification for the student
    type_name = fb.feedbackType.value.capitalize() if hasattr(fb.feedbackType, "value") else "Message"
    notif = Notification(
        id=str(uuid.uuid4()),
        userId=fb.userId,
        title=f"Response to your {type_name}",
        message=f"The placement team has responded to your {type_name.lower()}.",
        link="/feedback",
    )
    db.add(notif)
    await db.commit()
    await db.refresh(fb)

    # Non-blocking background email
    if fb.user and fb.user.email:
        background_tasks.add_task(
            send_notification_email,
            to_email=fb.user.email,
            subject=f"Placement Cell Response: Your {type_name}",
            message=(
                f"Hello {fb.user.name or 'Student'},\n\n"
                f"The Placement Cell has responded to your {type_name.lower()}:\n\n"
                f"\"{fb.adminResponse}\"\n\n"
                f"Log in to the portal to view full conversation history."
            ),
        )

    return _to_admin_feedback_response(fb)


@router.delete("/admin/{feedback_id}")
async def delete_feedback(
    feedback_id: str,
    admin_payload: dict = Depends(require_permission(PERM_FEEDBACKS_MANAGE)),
    db: AsyncSession = Depends(get_db),
):
    """Delete a feedback item."""
    stmt = select(Feedback).where(Feedback.id == feedback_id)
    fb = await db.scalar(stmt)
    if not fb:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Feedback item not found.")

    await db.delete(fb)
    await db.commit()
    return {"message": "Feedback deleted successfully."}

