from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.dependencies import get_db, require_student
from app.models.db import User, Resume
from app.schemas.student import StudentProfileUpdate, AadhaarUpdate, PanUpdate, ResumeResponse
from app.core.encryption import encrypt_value

router = APIRouter(prefix="/profile", tags=["profile"])

@router.get("")
async def get_profile(
    user_payload: dict = Depends(require_student),
    db: AsyncSession = Depends(get_db)
):
    user = await db.scalar(select(User).where(User.id == user_payload["sub"]))
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user

@router.patch("")
async def update_profile(
    profile_data: StudentProfileUpdate,
    user_payload: dict = Depends(require_student),
    db: AsyncSession = Depends(get_db)
):
    user = await db.scalar(select(User).where(User.id == user_payload["sub"]))
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    update_dict = profile_data.model_dump(exclude_unset=True)
    for key, value in update_dict.items():
        setattr(user, key, value)
    
    await db.commit()
    await db.refresh(user)
    return user

@router.put("/aadhaar")
async def save_aadhaar(
    data: AadhaarUpdate,
    user_payload: dict = Depends(require_student),
    db: AsyncSession = Depends(get_db)
):
    user = await db.scalar(select(User).where(User.id == user_payload["sub"]))
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    user.aadhaarEncrypted = encrypt_value(data.aadhaar)
    await db.commit()
    return {"message": "Aadhaar saved securely"}

@router.put("/pan")
async def save_pan(
    data: PanUpdate,
    user_payload: dict = Depends(require_student),
    db: AsyncSession = Depends(get_db)
):
    user = await db.scalar(select(User).where(User.id == user_payload["sub"]))
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    user.panCardEncrypted = encrypt_value(data.pan)
    await db.commit()
    return {"message": "PAN saved securely"}

@router.get("/resumes", response_model=list[ResumeResponse])
async def list_resumes(
    user_payload: dict = Depends(require_student),
    db: AsyncSession = Depends(get_db)
):
    resumes = await db.scalars(select(Resume).where(Resume.userId == user_payload["sub"]))
    return resumes.all()

@router.delete("/resumes/{resume_id}")
async def delete_resume(
    resume_id: str,
    user_payload: dict = Depends(require_student),
    db: AsyncSession = Depends(get_db)
):
    resume = await db.scalar(
        select(Resume).where(Resume.id == resume_id, Resume.userId == user_payload["sub"])
    )
    if not resume:
        raise HTTPException(status_code=404, detail="Resume not found")

    # Remove the stored asset from Cloudinary (best-effort; don't block the DB delete)
    if resume.publicId:
        from app.core.storage import delete_file
        try:
            delete_file(resume.publicId)
        except Exception:
            pass  # Log in production; do not surface Cloudinary errors to the client

    await db.delete(resume)
    await db.commit()
    return {"message": "Resume deleted"}

