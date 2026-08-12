from datetime import datetime
from typing import Optional
from pydantic import BaseModel, ConfigDict

class FeedbackBase(BaseModel):
    feedbackType: str
    content: str

class FeedbackCreate(FeedbackBase):
    pass

class FeedbackAdminResponse(BaseModel):
    adminResponse: str

class FeedbackResponse(FeedbackBase):
    id: str
    userId: str
    resolved: bool
    adminResponse: Optional[str] = None
    createdAt: datetime
    resolvedAt: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)
