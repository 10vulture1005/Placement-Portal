from datetime import datetime
from typing import Optional
from pydantic import BaseModel, ConfigDict

class NotificationCreate(BaseModel):
    title: str
    message: str
    link: Optional[str] = None

class NotificationResponse(BaseModel):
    id: str
    userId: str
    title: str
    message: str
    link: Optional[str] = None
    read: bool
    createdAt: datetime

    model_config = ConfigDict(from_attributes=True)
