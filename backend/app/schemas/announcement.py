from __future__ import annotations

from datetime import datetime
from typing import Optional
from pydantic import BaseModel, ConfigDict, Field

class AnnouncementCompanySummary(BaseModel):
    id: str
    name: str
    logoUrl: Optional[str] = None
    website: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)

class AnnouncementAuthorSummary(BaseModel):
    id: str
    name: Optional[str] = None
    email: Optional[str] = None
    role: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)

class AnnouncementBase(BaseModel):
    title: str = Field(..., min_length=2, max_length=200)
    content: str = Field(..., min_length=2, max_length=10000)
    category: str = Field(default="GENERAL")
    tags: list[str] = Field(default_factory=list)
    companyId: Optional[str] = None

class AnnouncementCreate(AnnouncementBase):
    pass

class AnnouncementUpdate(BaseModel):
    title: Optional[str] = Field(None, min_length=2, max_length=200)
    content: Optional[str] = Field(None, min_length=2, max_length=10000)
    category: Optional[str] = None
    tags: Optional[list[str]] = None
    companyId: Optional[str] = None

class AnnouncementResponse(AnnouncementBase):
    id: str
    createdAt: datetime
    createdById: str
    company: Optional[AnnouncementCompanySummary] = None
    createdByName: Optional[str] = None
    createdByEmail: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)

