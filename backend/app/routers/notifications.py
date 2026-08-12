from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.dependencies import get_db, require_student
from app.models.db import Notification
from app.schemas.notification import NotificationResponse

router = APIRouter(prefix="/notifications", tags=["notifications"])

@router.get("", response_model=list[NotificationResponse])
async def list_notifications(
    user_payload: dict = Depends(require_student),
    db: AsyncSession = Depends(get_db)
):
    notifications = await db.scalars(
        select(Notification)
        .where(Notification.userId == user_payload["sub"])
        .order_by(Notification.createdAt.desc())
    )
    return notifications.all()

@router.get("/unread-count")
async def unread_count(
    user_payload: dict = Depends(require_student),
    db: AsyncSession = Depends(get_db)
):
    from sqlalchemy import func
    count = await db.scalar(
        select(func.count(Notification.id))
        .where(Notification.userId == user_payload["sub"], Notification.read == False)
    )
    return {"count": count or 0}

@router.patch("/{notification_id}/read")
async def mark_read(
    notification_id: str,
    user_payload: dict = Depends(require_student),
    db: AsyncSession = Depends(get_db)
):
    notification = await db.scalar(
        select(Notification).where(Notification.id == notification_id, Notification.userId == user_payload["sub"])
    )
    if notification:
        notification.read = True
        await db.commit()
    return {"message": "Marked as read"}

@router.patch("/read-all")
async def mark_all_read(
    user_payload: dict = Depends(require_student),
    db: AsyncSession = Depends(get_db)
):
    from sqlalchemy import update
    await db.execute(
        update(Notification)
        .where(Notification.userId == user_payload["sub"], Notification.read == False)
        .values(read=True)
    )
    await db.commit()
    return {"message": "All marked as read"}
