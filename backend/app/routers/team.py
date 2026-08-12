from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.dependencies import get_db
from app.models.db import TeamMember
from app.schemas.team import TeamMemberResponse

router = APIRouter(prefix="/team", tags=["team"])

@router.get("", response_model=list[TeamMemberResponse])
async def list_team(db: AsyncSession = Depends(get_db)):
    team = await db.scalars(
        select(TeamMember).order_by(TeamMember.displayOrder.asc())
    )
    return team.all()
