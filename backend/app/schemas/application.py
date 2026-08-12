from datetime import datetime
from typing import Optional
from pydantic import BaseModel, ConfigDict

class ApplicationCreate(BaseModel):
    jobProfileId: str
    resumeId: Optional[str] = None

class ApplicationStatusUpdate(BaseModel):
    status: str

class ApplicationResponse(BaseModel):
    id: str
    userId: str
    jobProfileId: str
    status: str
    appliedAt: datetime
    updatedAt: datetime
    resumeId: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)
