from datetime import datetime
from typing import Optional
from pydantic import BaseModel, ConfigDict

class AnnouncementBase(BaseModel):
    title: str
    content: str
    category: str
    tags: list[str] = []
    companyId: Optional[str] = None

class AnnouncementCreate(AnnouncementBase):
    pass

class AnnouncementUpdate(BaseModel):
    title: Optional[str] = None
    content: Optional[str] = None
    category: Optional[str] = None
    tags: Optional[list[str]] = None
    companyId: Optional[str] = None

class AnnouncementResponse(AnnouncementBase):
    id: str
    createdAt: datetime
    createdById: str

    model_config = ConfigDict(from_attributes=True)
