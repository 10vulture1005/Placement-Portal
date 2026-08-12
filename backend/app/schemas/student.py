from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict, Field

class StudentProfileUpdate(BaseModel):
    name: Optional[str] = None
    rollNumber: Optional[str] = None
    personalEmail: Optional[str] = None
    contactNumber: Optional[str] = None
    altContactNumber: Optional[str] = None
    branch: Optional[str] = None
    degree: Optional[str] = None
    batch: Optional[int] = None
    gender: Optional[str] = None
    bloodGroup: Optional[str] = None
    dateOfBirth: Optional[datetime] = None
    currentAddress: Optional[str] = None
    class10Percent: Optional[float] = None
    class12Percent: Optional[float] = None
    cgpa: Optional[float] = None
    backlogs: Optional[int] = None

class AadhaarUpdate(BaseModel):
    aadhaar: str

class PanUpdate(BaseModel):
    pan: str

class ResumeResponse(BaseModel):
    id: str
    label: str
    fileUrl: str
    fileName: str
    uploadedAt: datetime

    model_config = ConfigDict(from_attributes=True)
