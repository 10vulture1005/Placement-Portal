from datetime import datetime
from typing import Optional
from pydantic import BaseModel, ConfigDict

class CompanyBase(BaseModel):
    name: str
    logoUrl: Optional[str] = None
    website: Optional[str] = None
    description: Optional[str] = None

class CompanyCreate(CompanyBase):
    pass

class CompanyUpdate(BaseModel):
    name: Optional[str] = None
    logoUrl: Optional[str] = None
    website: Optional[str] = None
    description: Optional[str] = None

class CompanyResponse(CompanyBase):
    id: str
    createdAt: datetime

    model_config = ConfigDict(from_attributes=True)
