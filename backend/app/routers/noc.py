from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.dependencies import get_db, require_student
from app.models.db import NocRequest, NocStatus
from app.schemas.noc import NocCreate, NocResponse

router = APIRouter(prefix="/noc", tags=["noc"])

@router.get("", response_model=list[NocResponse])
async def list_nocs(
    user_payload: dict = Depends(require_student),
    db: AsyncSession = Depends(get_db)
):
    nocs = await db.scalars(
        select(NocRequest).where(NocRequest.userId == user_payload["sub"]).order_by(NocRequest.createdAt.desc())
    )
    return nocs.all()

@router.post("", response_model=NocResponse)
async def create_noc(
    data: NocCreate,
    user_payload: dict = Depends(require_student),
    db: AsyncSession = Depends(get_db)
):
    import uuid
    noc = NocRequest(
        id=str(uuid.uuid4()),
        userId=user_payload["sub"],
        company=data.company,
        address=data.address,
        city=data.city,
        state=data.state,
        pincode=data.pincode,
        startDate=data.startDate,
        endDate=data.endDate,
        status=NocStatus.PENDING,
        message=data.message
    )
    db.add(noc)
    await db.commit()
    await db.refresh(noc)
    return noc

@router.patch("/{noc_id}/cancel")
async def cancel_noc(
    noc_id: str,
    user_payload: dict = Depends(require_student),
    db: AsyncSession = Depends(get_db)
):
    noc = await db.scalar(select(NocRequest).where(NocRequest.id == noc_id, NocRequest.userId == user_payload["sub"]))
    if not noc:
        raise HTTPException(status_code=404, detail="NOC not found")
        
    if noc.status != NocStatus.PENDING:
        raise HTTPException(status_code=400, detail="Can only cancel pending requests")
        
    await db.delete(noc)
    await db.commit()
    return {"message": "NOC request cancelled"}
