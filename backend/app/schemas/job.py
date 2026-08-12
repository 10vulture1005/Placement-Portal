from datetime import datetime
from typing import Optional
from pydantic import BaseModel, ConfigDict

class JobBase(BaseModel):
    companyId: str
    title: str
    type: str
    locations: list[str] = []
    ctcStipend: Optional[float] = None
    ctcStipendInfo: Optional[str] = None
    minCGPA: float = 0.0
    maxBacklogs: int = 0
    maxBans: int = 0
    allowedBranches: list[str] = []
    allowedDegrees: list[str] = []
    allowedGenders: list[str] = []
    jobCategory: Optional[str] = None
    batch: int
    registrationDeadline: datetime
    description: Optional[str] = None
    openingOverview: Optional[str] = None
    attachments: list[str] = []

class JobCreate(JobBase):
    pass

class JobUpdate(BaseModel):
    title: Optional[str] = None
    type: Optional[str] = None
    locations: Optional[list[str]] = None
    ctcStipend: Optional[float] = None
    ctcStipendInfo: Optional[str] = None
    minCGPA: Optional[float] = None
    maxBacklogs: Optional[int] = None
    maxBans: Optional[int] = None
    allowedBranches: Optional[list[str]] = None
    allowedDegrees: Optional[list[str]] = None
    allowedGenders: Optional[list[str]] = None
    jobCategory: Optional[str] = None
    batch: Optional[int] = None
    registrationDeadline: Optional[datetime] = None
    description: Optional[str] = None
    openingOverview: Optional[str] = None
    attachments: Optional[list[str]] = None

class JobStatusUpdate(BaseModel):
    status: str

class JobResponse(JobBase):
    id: str
    status: str
    createdAt: datetime
    createdById: str

    model_config = ConfigDict(from_attributes=True)
