from fastapi import APIRouter, Depends, UploadFile, File, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from app.dependencies import get_db, require_student, require_admin
from app.models.db import Resume
from app.core.storage import validate_pdf, upload_pdf

router = APIRouter(prefix="/uploads", tags=["uploads"])

@router.post("/resume")
async def upload_resume(
    file: UploadFile = File(...),
    user_payload: dict = Depends(require_student),
    db: AsyncSession = Depends(get_db)
):
    from sqlalchemy import select, func
    from app.core.config import settings
    import uuid

    # Check limits
    count = await db.scalar(select(func.count(Resume.id)).where(Resume.userId == user_payload["sub"]))
    if count and count >= settings.max_resumes_per_student:
        raise HTTPException(status_code=400, detail="Maximum resumes limit reached")

    content = await file.read()
    try:
        validate_pdf(content)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))
    
    # Upload to Cloudinary
    result = upload_pdf(content, folder=f"resumes/{user_payload['sub']}", public_id=str(uuid.uuid4()))
    
    resume = Resume(
        id=str(uuid.uuid4()),
        userId=user_payload["sub"],
        label=file.filename or "Resume",
        fileUrl=result["secure_url"],
        fileName=file.filename or "Resume.pdf"
    )
    db.add(resume)
    await db.commit()
    await db.refresh(resume)
    
    return resume

@router.post("/admin/noc-document")
async def upload_noc_document(
    file: UploadFile = File(...),
    admin_payload: dict = Depends(require_admin)
):
    import uuid
    content = await file.read()
    try:
        validate_pdf(content)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))
    
    result = upload_pdf(content, folder="noc_docs", public_id=str(uuid.uuid4()))
    return {"url": result["secure_url"]}
