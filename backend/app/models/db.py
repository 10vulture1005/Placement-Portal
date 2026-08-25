"""
SQLAlchemy ORM models — mirror of prisma/schema.prisma.

Prisma owns all migrations. FastAPI uses these models read/write
but never calls Base.metadata.create_all().

Table and column names match the Prisma-generated PostgreSQL schema exactly
(Prisma uses camelCase field names but maps them to snake_case columns).
"""
from __future__ import annotations

import enum
from datetime import datetime

from sqlalchemy import (
    BigInteger,
    Boolean,
    DateTime,
    Enum,
    Float,
    ForeignKey,
    Integer,
    String,
    Text,
    UniqueConstraint,
    func,
)
from sqlalchemy.dialects.postgresql import ARRAY
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


# ---------------------------------------------------------------------------
# Enums — keep in sync with prisma/schema.prisma
# ---------------------------------------------------------------------------

class Role(str, enum.Enum):
    STUDENT = "STUDENT"
    COORDINATOR = "COORDINATOR"
    OFFICER = "OFFICER"
    ADMIN = "ADMIN"
    SUPER_ADMIN = "SUPER_ADMIN"


class JobType(str, enum.Enum):
    INTERNSHIP = "INTERNSHIP"
    FTE = "FTE"
    INTERNSHIP_PPO = "INTERNSHIP_PPO"
    INTERNSHIP_FTE = "INTERNSHIP_FTE"


class JobStatus(str, enum.Enum):
    ACTIVE = "ACTIVE"
    ENDED = "ENDED"
    DRAFT = "DRAFT"


class ApplicationStatus(str, enum.Enum):
    APPLIED = "APPLIED"
    SHORTLISTED = "SHORTLISTED"
    INTERVIEW = "INTERVIEW"
    SELECTED = "SELECTED"
    REJECTED = "REJECTED"
    WITHDRAWN = "WITHDRAWN"


class FeedbackType(str, enum.Enum):
    QUERY = "QUERY"
    FEEDBACK = "FEEDBACK"
    COMPLAINT = "COMPLAINT"


class NocStatus(str, enum.Enum):
    PENDING = "PENDING"
    APPROVED = "APPROVED"
    REJECTED = "REJECTED"


class AnnouncementCategory(str, enum.Enum):
    COMPANY_EVENT = "COMPANY_EVENT"
    GENERAL = "GENERAL"


# ---------------------------------------------------------------------------
# Models
# ---------------------------------------------------------------------------

class User(Base):
    __tablename__ = "User"

    id: Mapped[str] = mapped_column(String, primary_key=True)
    name: Mapped[str | None] = mapped_column(String, nullable=True)
    email: Mapped[str | None] = mapped_column(String, unique=True, nullable=True)
    emailVerified: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    image: Mapped[str | None] = mapped_column(String, nullable=True)
    role: Mapped[Role] = mapped_column(Enum(Role, name="Role"), default=Role.STUDENT)
    customPermissions: Mapped[list[str]] = mapped_column(ARRAY(String), default=list)
    isActive: Mapped[bool] = mapped_column(Boolean, default=True)
    title: Mapped[str | None] = mapped_column(String, nullable=True)
    personalEmail: Mapped[str | None] = mapped_column(String, nullable=True)
    rollNumber: Mapped[str | None] = mapped_column(String, unique=True, nullable=True)
    branch: Mapped[str | None] = mapped_column(String, nullable=True)
    batch: Mapped[int | None] = mapped_column(Integer, nullable=True)
    degree: Mapped[str | None] = mapped_column(String, nullable=True)
    category: Mapped[str | None] = mapped_column(String, nullable=True)
    gender: Mapped[str | None] = mapped_column(String, nullable=True)
    dateOfBirth: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    bloodGroup: Mapped[str | None] = mapped_column(String, nullable=True)
    contactNumber: Mapped[str | None] = mapped_column(String, nullable=True)
    altContactNumber: Mapped[str | None] = mapped_column(String, nullable=True)
    currentAddress: Mapped[str | None] = mapped_column(Text, nullable=True)
    permanentAddress: Mapped[str | None] = mapped_column(Text, nullable=True)
    aadhaarEncrypted: Mapped[str | None] = mapped_column(String, nullable=True)
    aadhaarDocUrl: Mapped[str | None] = mapped_column(String, nullable=True)
    aadhaarDocFileName: Mapped[str | None] = mapped_column(String, nullable=True)
    panCardEncrypted: Mapped[str | None] = mapped_column(String, nullable=True)
    panCardDocUrl: Mapped[str | None] = mapped_column(String, nullable=True)
    panCardDocFileName: Mapped[str | None] = mapped_column(String, nullable=True)
    class10Percent: Mapped[float | None] = mapped_column(Float, nullable=True)
    class12Percent: Mapped[float | None] = mapped_column(Float, nullable=True)
    semGPAs: Mapped[list[float]] = mapped_column(ARRAY(Float), default=list)
    cgpa: Mapped[float | None] = mapped_column(Float, nullable=True)
    cgpaBeforeDrop: Mapped[float | None] = mapped_column(Float, nullable=True)
    graduationGPA: Mapped[float | None] = mapped_column(Float, nullable=True)
    backlogs: Mapped[int] = mapped_column(Integer, default=0)
    bans: Mapped[int] = mapped_column(Integer, default=0)
    qrCodeData: Mapped[str | None] = mapped_column(String, nullable=True)
    createdAt: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updatedAt: Mapped[datetime] = mapped_column(DateTime(timezone=True), onupdate=func.now(), server_default=func.now())

    applications: Mapped[list["Application"]] = relationship(back_populates="user")
    resumes: Mapped[list["Resume"]] = relationship(back_populates="user")
    feedbacks: Mapped[list["Feedback"]] = relationship(back_populates="user")
    noc_requests: Mapped[list["NocRequest"]] = relationship(back_populates="user")
    notifications: Mapped[list["Notification"]] = relationship(back_populates="user")
    created_jobs: Mapped[list["JobProfile"]] = relationship(back_populates="created_by", foreign_keys="JobProfile.createdById")
    created_announcements: Mapped[list["Announcement"]] = relationship(back_populates="created_by")


class Company(Base):
    __tablename__ = "Company"

    id: Mapped[str] = mapped_column(String, primary_key=True)
    name: Mapped[str] = mapped_column(String, unique=True)
    logoUrl: Mapped[str | None] = mapped_column(String, nullable=True)
    website: Mapped[str | None] = mapped_column(String, nullable=True)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    createdAt: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    jobs: Mapped[list["JobProfile"]] = relationship(back_populates="company", cascade="all, delete-orphan")
    announcements: Mapped[list["Announcement"]] = relationship(back_populates="company")


class JobProfile(Base):
    __tablename__ = "JobProfile"

    id: Mapped[str] = mapped_column(String, primary_key=True)
    companyId: Mapped[str] = mapped_column(String, ForeignKey("Company.id", ondelete="CASCADE"))
    title: Mapped[str] = mapped_column(String)
    type: Mapped[JobType] = mapped_column(Enum(JobType, name="JobType"))
    locations: Mapped[list[str]] = mapped_column(ARRAY(String), default=list)
    ctcStipend: Mapped[float | None] = mapped_column(Float, nullable=True)
    ctcStipendInfo: Mapped[str | None] = mapped_column(String, nullable=True)
    minCGPA: Mapped[float] = mapped_column(Float, default=0)
    maxBacklogs: Mapped[int] = mapped_column(Integer, default=0)
    maxBans: Mapped[int] = mapped_column(Integer, default=0)
    allowedBranches: Mapped[list[str]] = mapped_column(ARRAY(String), default=list)
    allowedDegrees: Mapped[list[str]] = mapped_column(ARRAY(String), default=list)
    allowedGenders: Mapped[list[str]] = mapped_column(ARRAY(String), default=list)
    jobCategory: Mapped[str | None] = mapped_column(String, nullable=True)
    batch: Mapped[int] = mapped_column(Integer)
    registrationDeadline: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    status: Mapped[JobStatus] = mapped_column(Enum(JobStatus, name="JobStatus"), default=JobStatus.DRAFT)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    openingOverview: Mapped[str | None] = mapped_column(Text, nullable=True)
    attachments: Mapped[list[str]] = mapped_column(ARRAY(String), default=list)
    createdAt: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    createdById: Mapped[str] = mapped_column(String, ForeignKey("User.id"))

    company: Mapped["Company"] = relationship(back_populates="jobs")
    created_by: Mapped["User"] = relationship(back_populates="created_jobs", foreign_keys=[createdById])
    applications: Mapped[list["Application"]] = relationship(back_populates="job_profile", cascade="all, delete-orphan")
    coordinators: Mapped[list["Coordinator"]] = relationship(back_populates="job_profile", cascade="all, delete-orphan")


class Application(Base):
    __tablename__ = "Application"
    __table_args__ = (UniqueConstraint("userId", "jobProfileId"),)

    id: Mapped[str] = mapped_column(String, primary_key=True)
    userId: Mapped[str] = mapped_column(String, ForeignKey("User.id", ondelete="CASCADE"))
    jobProfileId: Mapped[str] = mapped_column(String, ForeignKey("JobProfile.id", ondelete="CASCADE"))
    status: Mapped[ApplicationStatus] = mapped_column(Enum(ApplicationStatus, name="ApplicationStatus"), default=ApplicationStatus.APPLIED)
    appliedAt: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updatedAt: Mapped[datetime] = mapped_column(DateTime(timezone=True), onupdate=func.now(), server_default=func.now())
    resumeId: Mapped[str | None] = mapped_column(String, ForeignKey("Resume.id", ondelete="SET NULL"), nullable=True)

    user: Mapped["User"] = relationship(back_populates="applications")
    job_profile: Mapped["JobProfile"] = relationship(back_populates="applications")
    resume: Mapped["Resume | None"] = relationship(back_populates="applications")


class Announcement(Base):
    __tablename__ = "Announcement"

    id: Mapped[str] = mapped_column(String, primary_key=True)
    title: Mapped[str] = mapped_column(String)
    companyId: Mapped[str | None] = mapped_column(String, ForeignKey("Company.id", ondelete="SET NULL"), nullable=True)
    content: Mapped[str] = mapped_column(Text)
    tags: Mapped[list[str]] = mapped_column(ARRAY(String), default=list)
    category: Mapped[AnnouncementCategory] = mapped_column(Enum(AnnouncementCategory, name="AnnouncementCategory"))
    createdAt: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    createdById: Mapped[str] = mapped_column(String, ForeignKey("User.id"))

    company: Mapped["Company | None"] = relationship(back_populates="announcements")
    created_by: Mapped["User"] = relationship(back_populates="created_announcements")


class Feedback(Base):
    __tablename__ = "Feedback"

    id: Mapped[str] = mapped_column(String, primary_key=True)
    userId: Mapped[str] = mapped_column(String, ForeignKey("User.id", ondelete="CASCADE"))
    feedbackType: Mapped[FeedbackType] = mapped_column(Enum(FeedbackType, name="FeedbackType"))
    content: Mapped[str] = mapped_column(Text)
    resolved: Mapped[bool] = mapped_column(Boolean, default=False)
    adminResponse: Mapped[str | None] = mapped_column(Text, nullable=True)
    createdAt: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    resolvedAt: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    user: Mapped["User"] = relationship(back_populates="feedbacks")


class NocRequest(Base):
    __tablename__ = "NocRequest"

    id: Mapped[str] = mapped_column(String, primary_key=True)
    userId: Mapped[str] = mapped_column(String, ForeignKey("User.id", ondelete="CASCADE"))
    company: Mapped[str] = mapped_column(String)
    address: Mapped[str] = mapped_column(String)
    city: Mapped[str] = mapped_column(String)
    state: Mapped[str] = mapped_column(String)
    pincode: Mapped[str] = mapped_column(String)
    startDate: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    endDate: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    status: Mapped[NocStatus] = mapped_column(Enum(NocStatus, name="NocStatus"), default=NocStatus.PENDING)
    message: Mapped[str | None] = mapped_column(Text, nullable=True)
    documentUrl: Mapped[str | None] = mapped_column(String, nullable=True)
    createdAt: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updatedAt: Mapped[datetime] = mapped_column(DateTime(timezone=True), onupdate=func.now(), server_default=func.now())

    user: Mapped["User"] = relationship(back_populates="noc_requests")


class Resume(Base):
    __tablename__ = "Resume"

    id: Mapped[str] = mapped_column(String, primary_key=True)
    userId: Mapped[str] = mapped_column(String, ForeignKey("User.id", ondelete="CASCADE"))
    label: Mapped[str] = mapped_column(String)
    fileUrl: Mapped[str] = mapped_column(String)
    fileName: Mapped[str] = mapped_column(String)
    publicId: Mapped[str | None] = mapped_column(String, nullable=True)
    uploadedAt: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    user: Mapped["User"] = relationship(back_populates="resumes")
    applications: Mapped[list["Application"]] = relationship(back_populates="resume")



class Coordinator(Base):
    __tablename__ = "Coordinator"

    id: Mapped[str] = mapped_column(String, primary_key=True)
    jobProfileId: Mapped[str] = mapped_column(String, ForeignKey("JobProfile.id", ondelete="CASCADE"))
    name: Mapped[str] = mapped_column(String)
    phone: Mapped[str] = mapped_column(String)

    job_profile: Mapped["JobProfile"] = relationship(back_populates="coordinators")


class TeamMember(Base):
    __tablename__ = "TeamMember"

    id: Mapped[str] = mapped_column(String, primary_key=True)
    name: Mapped[str] = mapped_column(String)
    role: Mapped[str] = mapped_column(String)
    email: Mapped[str | None] = mapped_column(String, nullable=True)
    phone: Mapped[str | None] = mapped_column(String, nullable=True)
    photoUrl: Mapped[str | None] = mapped_column(String, nullable=True)
    displayOrder: Mapped[int] = mapped_column(Integer, default=0)


class Notification(Base):
    __tablename__ = "Notification"

    id: Mapped[str] = mapped_column(String, primary_key=True)
    userId: Mapped[str] = mapped_column(String, ForeignKey("User.id", ondelete="CASCADE"))
    title: Mapped[str] = mapped_column(String)
    message: Mapped[str] = mapped_column(Text)
    link: Mapped[str | None] = mapped_column(String, nullable=True)
    read: Mapped[bool] = mapped_column(Boolean, default=False)
    createdAt: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    user: Mapped["User"] = relationship(back_populates="notifications")


class SystemSetting(Base):
    __tablename__ = "SystemSetting"

    key: Mapped[str] = mapped_column(String, primary_key=True)
    value: Mapped[str] = mapped_column(Text)
    updatedAt: Mapped[datetime] = mapped_column(DateTime(timezone=True), onupdate=func.now(), server_default=func.now())
