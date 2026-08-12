from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.dependencies import get_db, require_student
from app.models.db import Feedback
from app.schemas.feedback import FeedbackCreate, FeedbackResponse

router = APIRouter(prefix="/feedback", tags=["feedback"])

@router.get("", response_model=list[FeedbackResponse])
async def list_feedback(
    user_payload: dict = Depends(require_student),
    db: AsyncSession = Depends(get_db)
):
    feedbacks = await db.scalars(
        select(Feedback).where(Feedback.userId == user_payload["sub"]).order_by(Feedback.createdAt.desc())
    )
    return feedbacks.all()

@router.post("", response_model=FeedbackResponse)
async def submit_feedback(
    data: FeedbackCreate,
    user_payload: dict = Depends(require_student),
    db: AsyncSession = Depends(get_db)
):
    import uuid
    import json
    fb = Feedback(
        id=str(uuid.uuid4()),
        userId=user_payload["sub"],
        feedbackType=data.feedbackType,
        content=data.content
    )
    db.add(fb)
    await db.commit()
    await db.refresh(fb)
    return fb
