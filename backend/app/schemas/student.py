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
    aadhaar: str = Field(..., min_length=12, max_length=12)

class PanUpdate(BaseModel):
    pan: str = Field(..., min_length=10, max_length=10)

class ResumeUpdate(BaseModel):
    label: str = Field(..., min_length=1, max_length=100)

class ResumeResponse(BaseModel):
    id: str
    label: str
    fileUrl: str
    fileName: str
    uploadedAt: datetime

class AadhaarUnlockRequest(BaseModel):
    aadhaar: str = Field(..., min_length=12, max_length=12)

class PanUnlockRequest(BaseModel):
    pan: str = Field(..., min_length=10, max_length=10)

class StudentProfileResponse(BaseModel):
    id: str
    name: Optional[str] = None
    email: Optional[str] = None
    role: str
    personalEmail: Optional[str] = None
    rollNumber: Optional[str] = None
    branch: Optional[str] = None
    batch: Optional[int] = None
    degree: Optional[str] = None
    category: Optional[str] = None
    gender: Optional[str] = None
    dateOfBirth: Optional[datetime] = None
    bloodGroup: Optional[str] = None
    contactNumber: Optional[str] = None
    altContactNumber: Optional[str] = None
    currentAddress: Optional[str] = None
    permanentAddress: Optional[str] = None
    aadhaarProvided: bool = False
    aadhaarMasked: Optional[str] = None
    aadhaarDocProvided: bool = False
    aadhaarDocFileName: Optional[str] = None
    panProvided: bool = False
    panMasked: Optional[str] = None
    panDocProvided: bool = False
    panDocFileName: Optional[str] = None
    class10Percent: Optional[float] = None
    class12Percent: Optional[float] = None
    cgpa: Optional[float] = None
    backlogs: int = 0
    bans: int = 0

    model_config = ConfigDict(from_attributes=True)


