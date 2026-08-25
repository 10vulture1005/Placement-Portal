from typing import Optional
from pydantic import BaseModel, ConfigDict

class TeamMemberBase(BaseModel):
    name: str
    role: str
    email: Optional[str] = None
    phone: Optional[str] = None
    photoUrl: Optional[str] = None
    displayOrder: int = 0

class TeamMemberCreate(TeamMemberBase):
    pass

class TeamMemberUpdate(BaseModel):
    name: Optional[str] = None
    role: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    photoUrl: Optional[str] = None
    displayOrder: Optional[int] = None

class TeamMemberOrderUpdate(BaseModel):
    id: str
    displayOrder: int

class TeamMemberResponse(TeamMemberBase):
    id: str

    model_config = ConfigDict(from_attributes=True)

class TeamAdminMemberResponse(TeamMemberResponse):
    userId: Optional[str] = None
    hasUserAccount: bool = False
    userRole: Optional[str] = None
    userActive: Optional[bool] = None
    userCustomPermissions: list[str] = []

class DefaultPermissionsResponse(BaseModel):
    defaultPermissions: list[str]

class DefaultPermissionsUpdate(BaseModel):
    defaultPermissions: list[str]
    syncExistingMembers: bool = False

class ReorderTeamRequest(BaseModel):
    items: list[TeamMemberOrderUpdate]
