from datetime import datetime
from typing import Optional
from pydantic import BaseModel, ConfigDict

class NocBase(BaseModel):
    company: str
    address: str
    city: str
    state: str
    pincode: str
    startDate: datetime
    endDate: datetime
    message: Optional[str] = None

class NocCreate(NocBase):
    pass

class NocReject(BaseModel):
    message: Optional[str] = None

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
