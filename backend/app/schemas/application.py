from datetime import datetime
from typing import Optional
from pydantic import BaseModel, ConfigDict
from app.models.db import ApplicationStatus

class ApplicationCreate(BaseModel):
    jobProfileId: str
    resumeId: Optional[str] = None

class ApplicationStatusUpdate(BaseModel):
    status: ApplicationStatus

class BulkStatusUpdate(BaseModel):
    applicationIds: list[str]
    status: ApplicationStatus

class ApplicationResponse(BaseModel):
    id: str
    userId: str
    jobProfileId: str
    status: str
    appliedAt: datetime
    updatedAt: datetime
    resumeId: Optional[str] = None
    jobTitle: Optional[str] = None
    companyName: Optional[str] = None
    companyLogo: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)

class AdminApplicationItem(BaseModel):
    id: str
    userId: str
    studentName: str
    studentEmail: str
    rollNumber: Optional[str] = None
    branch: Optional[str] = None
    batch: Optional[int] = None
    cgpa: Optional[float] = None
    jobProfileId: str
    jobTitle: str
    companyId: str
    companyName: str
    resumeId: Optional[str] = None
    resumeUrl: Optional[str] = None
    resumeLabel: Optional[str] = None
    status: str
    appliedAt: datetime
    updatedAt: datetime

    model_config = ConfigDict(from_attributes=True)

