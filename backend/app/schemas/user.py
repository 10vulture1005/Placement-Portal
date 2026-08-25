from __future__ import annotations

from datetime import datetime
from pydantic import BaseModel, ConfigDict, EmailStr, Field


class UserSummary(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    name: str | None = None
    email: str | None = None
    image: str | None = None
    role: str
    title: str | None = None
    isActive: bool = True
    rollNumber: str | None = None
    branch: str | None = None
    batch: int | None = None
    customPermissions: list[str] = Field(default_factory=list)
    effectivePermissions: list[str] = Field(default_factory=list)
    applicationCount: int = 0
    createdAt: datetime


class UserStats(BaseModel):
    totalUsers: int = 0
    superAdmins: int = 0
    admins: int = 0
    officers: int = 0
    coordinators: int = 0
    students: int = 0
    inactive: int = 0


class UserListResponse(BaseModel):
    users: list[UserSummary]
    total: int
    stats: UserStats


class UserCreate(BaseModel):
    email: EmailStr
    name: str | None = None
    role: str = "STUDENT"
    title: str | None = None
    rollNumber: str | None = None
    branch: str | None = None
    batch: int | None = None
    customPermissions: list[str] = Field(default_factory=list)
    isActive: bool = True


class UserUpdate(BaseModel):
    name: str | None = None
    title: str | None = None
    rollNumber: str | None = None
    branch: str | None = None
    batch: int | None = None
    personalEmail: str | None = None
    contactNumber: str | None = None


class UserRoleUpdate(BaseModel):
    role: str
    title: str | None = None


class UserPermissionsUpdate(BaseModel):
    customPermissions: list[str] = Field(default_factory=list)


class UserStatusUpdate(BaseModel):
    isActive: bool


class PermissionItem(BaseModel):
    key: str
    label: str
    category: str
    description: str
    defaultRoles: list[str]


class PermissionCatalogResponse(BaseModel):
    permissions: list[PermissionItem]
    categories: list[str]
    roleDefaults: dict[str, list[str]]
