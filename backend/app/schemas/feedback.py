from __future__ import annotations

from datetime import datetime
from typing import Optional
from pydantic import BaseModel, ConfigDict, Field, field_validator


class FeedbackStudentSummary(BaseModel):
    id: str
    name: Optional[str] = None
    email: Optional[str] = None
    rollNumber: Optional[str] = None
    branch: Optional[str] = None
    batch: Optional[int] = None
    contactNumber: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


class FeedbackBase(BaseModel):
    feedbackType: str = Field(..., description="QUERY, FEEDBACK, or COMPLAINT")
    content: str = Field(..., min_length=5, max_length=5000)

    @field_validator("feedbackType")
    @classmethod
    def validate_type(cls, v: str) -> str:
        norm = v.strip().upper()
        if norm not in ("QUERY", "FEEDBACK", "COMPLAINT"):
            raise ValueError("feedbackType must be one of QUERY, FEEDBACK, or COMPLAINT")
        return norm


class FeedbackCreate(FeedbackBase):
    pass


class FeedbackReplyRequest(BaseModel):
    adminResponse: str = Field(..., min_length=2, max_length=4000)
    resolve: bool = True


class FeedbackResponse(FeedbackBase):
    id: str
    userId: str
    resolved: bool
    adminResponse: Optional[str] = None
    createdAt: datetime
    resolvedAt: Optional[datetime] = None
    subject: Optional[str] = None
    message: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


class AdminFeedbackResponse(FeedbackResponse):
    student: Optional[FeedbackStudentSummary] = None


class FeedbackMetricsResponse(BaseModel):
    total: int
    pending: int
    resolved: int
    queries: int
    feedback: int
    complaints: int

