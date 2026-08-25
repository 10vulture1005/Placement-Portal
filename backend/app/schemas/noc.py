from __future__ import annotations

from datetime import datetime
from typing import Optional
from pydantic import BaseModel, ConfigDict, Field, model_validator


class NocStudentSummary(BaseModel):
    id: str
    name: Optional[str] = None
    email: Optional[str] = None
    rollNumber: Optional[str] = None
    branch: Optional[str] = None
    batch: Optional[int] = None
    cgpa: Optional[float] = None
    contactNumber: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


class NocBase(BaseModel):
    company: str = Field(..., min_length=2, max_length=200)
    address: str = Field(..., min_length=2, max_length=500)
    city: str = Field(..., min_length=2, max_length=100)
    state: str = Field(..., min_length=2, max_length=100)
    pincode: str = Field(..., pattern=r"^[0-9]{6}$", description="6-digit postal code")
    startDate: datetime
    endDate: datetime
    message: Optional[str] = Field(None, max_length=2000)


class NocCreate(NocBase):
    @model_validator(mode="after")
    def validate_dates(self) -> "NocCreate":
        if self.endDate < self.startDate:
            raise ValueError("End date cannot be earlier than start date.")
        return self


class NocApproveRequest(BaseModel):
    message: Optional[str] = Field(None, max_length=2000)
    documentUrl: Optional[str] = None


class NocRejectRequest(BaseModel):
    message: Optional[str] = Field(None, max_length=2000)


class NocDocument(BaseModel):
    documentUrl: str


class NocResponse(NocBase):
    id: str
    userId: str
    status: str
    documentUrl: Optional[str] = None
    createdAt: datetime
    updatedAt: datetime

    model_config = ConfigDict(from_attributes=True)


class AdminNocResponse(NocResponse):
    student: Optional[NocStudentSummary] = None


class NocMetricsResponse(BaseModel):
    total: int
    pending: int
    approved: int
    rejected: int

