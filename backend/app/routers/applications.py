import csv
import io
import uuid
from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Query, Response
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import joinedload, selectinload

from app.dependencies import get_db, require_admin, require_student
from app.models.db import (
    Application,
    ApplicationStatus,
    Company,
    JobProfile,
    JobStatus,
    Notification,
    Resume,
    User,
)
from app.schemas.application import (
    AdminApplicationItem,
    ApplicationCreate,
    ApplicationResponse,
    ApplicationStatusUpdate,
    BulkStatusUpdate,
)
from app.services.eligibility import (
    evaluate_eligibility,
    is_eligible,
    to_eligibility_profile,
)
from app.services.email import send_notification_email

router = APIRouter(prefix="/applications", tags=["applications"])


# ============================================================================
# Student Endpoints
# ============================================================================

@router.get("", response_model=list[ApplicationResponse])
async def list_student_applications(
    user_payload: dict = Depends(require_student),
    db: AsyncSession = Depends(get_db),
):
    stmt = (
        select(Application)
        .where(Application.userId == user_payload["sub"])
        .options(
            joinedload(Application.job_profile).joinedload(JobProfile.company),
            joinedload(Application.resume),
        )
        .order_by(Application.appliedAt.desc())
    )
    result = await db.scalars(stmt)
    apps = result.all()

    return [
        ApplicationResponse(
            id=app.id,
            userId=app.userId,
            jobProfileId=app.jobProfileId,
            status=app.status.value if hasattr(app.status, "value") else str(app.status),
            appliedAt=app.appliedAt,
            updatedAt=app.updatedAt,
            resumeId=app.resumeId,
            jobTitle=app.job_profile.title if app.job_profile else None,
            companyName=app.job_profile.company.name if app.job_profile and app.job_profile.company else None,
            companyLogo=app.job_profile.company.logoUrl if app.job_profile and app.job_profile.company else None,
        )
        for app in apps
    ]


@router.post("", response_model=ApplicationResponse)
async def apply_to_job(
    data: ApplicationCreate,
    user_payload: dict = Depends(require_student),
    db: AsyncSession = Depends(get_db),
):
    # 1. Verify job exists and is ACTIVE
    job_stmt = (
        select(JobProfile)
        .where(JobProfile.id == data.jobProfileId)
        .options(joinedload(JobProfile.company))
    )
    job = await db.scalar(job_stmt)
    if not job or job.status != JobStatus.ACTIVE:
        raise HTTPException(status_code=400, detail="Applications for this role are not active.")

    now = datetime.now(timezone.utc)
    # If registrationDeadline is tz-naive or tz-aware
    deadline = job.registrationDeadline
    if deadline.tzinfo is None:
        deadline = deadline.replace(tzinfo=timezone.utc)
    if deadline < now:
        raise HTTPException(status_code=400, detail="The registration deadline for this role has passed.")

    # 2. Check if already applied
    existing = await db.scalar(
        select(Application).where(
            Application.userId == user_payload["sub"],
            Application.jobProfileId == data.jobProfileId,
        )
    )
    if existing:
        raise HTTPException(status_code=400, detail="Application already submitted for this role.")

    # 3. Load student profile and verify completeness
    user = await db.scalar(select(User).where(User.id == user_payload["sub"]))
    if not user:
        raise HTTPException(status_code=404, detail="Student profile not found.")

    resumes_count = await db.scalar(
        select(func.count(Resume.id)).where(Resume.userId == user.id)
    ) or 0

    # 4. If a resume was selected, verify ownership
    if data.resumeId:
        resume = await db.scalar(
            select(Resume).where(Resume.id == data.resumeId, Resume.userId == user.id)
        )
        if not resume:
            raise HTTPException(status_code=400, detail="Selected resume is invalid or does not belong to you.")

    # 5. Evaluate eligibility
    profile = to_eligibility_profile(user, resumes_count)
    if not profile:
        raise HTTPException(status_code=400, detail="Please complete your academic profile before applying.")

    checks = evaluate_eligibility(
        cgpa=profile["cgpa"],
        batch=profile["batch"],
        branch=profile["branch"],
        backlogs=profile["backlogs"],
        bans=profile["bans"],
        documents_complete=profile["documents_complete"],
        min_cgpa=job.minCGPA,
        job_batch=job.batch,
        allowed_branches=job.allowedBranches,
        max_backlogs=job.maxBacklogs,
        max_bans=job.maxBans,
    )
    if not is_eligible(checks):
        failed_checks = [c.label for c in checks if not c.passed]
        raise HTTPException(
            status_code=400,
            detail=f"Your profile does not meet eligibility criteria: {', '.join(failed_checks)}",
        )

    # 6. Create application
    app_id = str(uuid.uuid4())
    app = Application(
        id=app_id,
        userId=user.id,
        jobProfileId=job.id,
        resumeId=data.resumeId,
        status=ApplicationStatus.APPLIED,
    )
    db.add(app)
    await db.commit()
    await db.refresh(app)

    return ApplicationResponse(
        id=app.id,
        userId=app.userId,
        jobProfileId=app.jobProfileId,
        status=app.status.value if hasattr(app.status, "value") else str(app.status),
        appliedAt=app.appliedAt,
        updatedAt=app.updatedAt,
        resumeId=app.resumeId,
        jobTitle=job.title,
        companyName=job.company.name if job.company else None,
        companyLogo=job.company.logoUrl if job.company else None,
    )


@router.patch("/{app_id}/withdraw")
async def withdraw_application(
    app_id: str,
    user_payload: dict = Depends(require_student),
    db: AsyncSession = Depends(get_db),
):
    app = await db.scalar(
        select(Application).where(
            Application.id == app_id,
            Application.userId == user_payload["sub"],
        )
    )
    if not app:
        raise HTTPException(status_code=404, detail="Application not found.")

    if app.status not in (ApplicationStatus.APPLIED, ApplicationStatus.SHORTLISTED):
        raise HTTPException(
            status_code=400,
            detail="Cannot withdraw application once interview stage or final decision has begun.",
        )

    app.status = ApplicationStatus.WITHDRAWN
    await db.commit()
    return {"message": "Application withdrawn successfully."}


# ============================================================================
# Administrator Endpoints
# ============================================================================

@router.get("/admin", response_model=list[AdminApplicationItem])
async def list_admin_applications(
    job_id: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    branch: Optional[str] = Query(None),
    batch: Optional[int] = Query(None),
    search: Optional[str] = Query(None),
    admin_payload: dict = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    stmt = (
        select(Application)
        .options(
            joinedload(Application.user),
            joinedload(Application.job_profile).joinedload(JobProfile.company),
            joinedload(Application.resume),
        )
        .order_by(Application.updatedAt.desc())
    )

    if job_id:
        stmt = stmt.where(Application.jobProfileId == job_id)
    if status and status != "ALL":
        try:
            enum_status = ApplicationStatus[status.upper()]
            stmt = stmt.where(Application.status == enum_status)
        except KeyError:
            pass
    if (branch and branch != "ALL") or batch:
        stmt = stmt.join(Application.user)
        if branch and branch != "ALL":
            stmt = stmt.where(User.branch == branch)
        if batch:
            stmt = stmt.where(User.batch == batch)

    result = await db.scalars(stmt)
    apps = result.unique().all()

    items = []
    for app in apps:
        if not app.user or not app.job_profile:
            continue

        student_name = app.user.name or app.user.rollNumber or "Student"
        student_email = app.user.email or ""

        # Filter by search string if provided
        if search:
            q = search.lower()
            haystack = f"{student_name} {student_email} {app.user.rollNumber or ''} {app.job_profile.title} {app.job_profile.company.name if app.job_profile.company else ''}".lower()
            if q not in haystack:
                continue

        items.append(
            AdminApplicationItem(
                id=app.id,
                userId=app.userId,
                studentName=student_name,
                studentEmail=student_email,
                rollNumber=app.user.rollNumber,
                branch=app.user.branch,
                batch=app.user.batch,
                cgpa=app.user.cgpa,
                jobProfileId=app.jobProfileId,
                jobTitle=app.job_profile.title,
                companyId=app.job_profile.companyId,
                companyName=app.job_profile.company.name if app.job_profile.company else "Unknown",
                resumeId=app.resumeId,
                resumeUrl=app.resume.fileUrl if app.resume else None,
                resumeLabel=app.resume.label if app.resume else None,
                status=app.status.value if hasattr(app.status, "value") else str(app.status),
                appliedAt=app.appliedAt,
                updatedAt=app.updatedAt,
            )
        )

    return items


@router.patch("/admin/{app_id}/status", response_model=AdminApplicationItem)
async def update_application_status(
    app_id: str,
    data: ApplicationStatusUpdate,
    background_tasks: BackgroundTasks,
    admin_payload: dict = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    stmt = (
        select(Application)
        .where(Application.id == app_id)
        .options(
            joinedload(Application.user),
            joinedload(Application.job_profile).joinedload(JobProfile.company),
            joinedload(Application.resume),
        )
    )
    app = await db.scalar(stmt)
    if not app:
        raise HTTPException(status_code=404, detail="Application not found.")

    old_status = app.status
    app.status = data.status

    # In-app notification
    job_title = app.job_profile.title if app.job_profile else "Job"
    company_name = app.job_profile.company.name if app.job_profile and app.job_profile.company else "Company"
    status_str = data.status.value if hasattr(data.status, "value") else str(data.status)

    notif = Notification(
        id=str(uuid.uuid4()),
        userId=app.userId,
        title=f"Application Update: {job_title}",
        message=f"Your application for {job_title} at {company_name} is now: {status_str}.",
        link="/applications",
    )
    db.add(notif)
    await db.commit()
    await db.refresh(app)

    # Non-blocking background email dispatch
    if app.user and app.user.email:
        background_tasks.add_task(
            send_notification_email,
            to_email=app.user.email,
            subject=f"Application Status Update: {company_name} - {job_title}",
            message=f"Hello {app.user.name or 'Student'},\n\nYour application status for {job_title} at {company_name} has been updated to '{status_str}'.\n\nPlease log in to your placement portal to view full details.",
        )

    return AdminApplicationItem(
        id=app.id,
        userId=app.userId,
        studentName=app.user.name or app.user.rollNumber or "Student" if app.user else "Student",
        studentEmail=app.user.email or "" if app.user else "",
        rollNumber=app.user.rollNumber if app.user else None,
        branch=app.user.branch if app.user else None,
        batch=app.user.batch if app.user else None,
        cgpa=app.user.cgpa if app.user else None,
        jobProfileId=app.jobProfileId,
        jobTitle=job_title,
        companyId=app.job_profile.companyId if app.job_profile else "",
        companyName=company_name,
        resumeId=app.resumeId,
        resumeUrl=app.resume.fileUrl if app.resume else None,
        resumeLabel=app.resume.label if app.resume else None,
        status=status_str,
        appliedAt=app.appliedAt,
        updatedAt=app.updatedAt,
    )


@router.post("/admin/bulk-status")
async def bulk_update_application_status(
    data: BulkStatusUpdate,
    background_tasks: BackgroundTasks,
    admin_payload: dict = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    if not data.applicationIds:
        return {"updated": 0, "status": data.status.value}

    stmt = (
        select(Application)
        .where(Application.id.in_(data.applicationIds))
        .options(
            joinedload(Application.user),
            joinedload(Application.job_profile).joinedload(JobProfile.company),
        )
    )
    result = await db.scalars(stmt)
    apps = result.unique().all()

    status_str = data.status.value if hasattr(data.status, "value") else str(data.status)
    updated_count = 0
    notifications_to_send: list[tuple[str, str, str, str]] = []

    for app in apps:
        app.status = data.status
        updated_count += 1

        job_title = app.job_profile.title if app.job_profile else "Job"
        company_name = app.job_profile.company.name if app.job_profile and app.job_profile.company else "Company"

        notif = Notification(
            id=str(uuid.uuid4()),
            userId=app.userId,
            title=f"Application Update: {job_title}",
            message=f"Your application for {job_title} at {company_name} is now: {status_str}.",
            link="/applications",
        )
        db.add(notif)

        if app.user and app.user.email:
            notifications_to_send.append((app.user.email, app.user.name or "Student", job_title, company_name))

    await db.commit()

    # Dispatch background emails after successful commit
    for email, name, job_title, company_name in notifications_to_send:
        background_tasks.add_task(
            send_notification_email,
            to_email=email,
            subject=f"Application Status Update: {company_name} - {job_title}",
            message=f"Hello {name},\n\nYour application status for {job_title} at {company_name} has been updated to '{status_str}'.\n\nPlease log in to your placement portal to view details.",
        )

    return {"updated": updated_count, "status": status_str}


@router.get("/admin/export")
async def export_applications_csv(
    job_id: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    branch: Optional[str] = Query(None),
    batch: Optional[int] = Query(None),
    admin_payload: dict = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    stmt = (
        select(Application)
        .options(
            joinedload(Application.user),
            joinedload(Application.job_profile).joinedload(JobProfile.company),
            joinedload(Application.resume),
        )
        .order_by(Application.appliedAt.desc())
    )

    if job_id:
        stmt = stmt.where(Application.jobProfileId == job_id)
    if status and status != "ALL":
        try:
            enum_status = ApplicationStatus[status.upper()]
            stmt = stmt.where(Application.status == enum_status)
        except KeyError:
            pass
    if (branch and branch != "ALL") or batch:
        stmt = stmt.join(Application.user)
        if branch and branch != "ALL":
            stmt = stmt.where(User.branch == branch)
        if batch:
            stmt = stmt.where(User.batch == batch)

    result = await db.scalars(stmt)
    apps = result.unique().all()

    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow([
        "Application ID",
        "Student Name",
        "Roll Number",
        "Email",
        "Branch",
        "Batch",
        "CGPA",
        "Company",
        "Job Title",
        "Status",
        "Applied Date",
        "Resume Label",
        "Resume URL",
    ])

    for app in apps:
        if not app.user or not app.job_profile:
            continue
        writer.writerow([
            app.id,
            app.user.name or "",
            app.user.rollNumber or "",
            app.user.email or "",
            app.user.branch or "",
            app.user.batch or "",
            app.user.cgpa or "",
            app.job_profile.company.name if app.job_profile.company else "",
            app.job_profile.title,
            app.status.value if hasattr(app.status, "value") else str(app.status),
            app.appliedAt.strftime("%Y-%m-%d %H:%M:%S") if app.appliedAt else "",
            app.resume.label if app.resume else "",
            app.resume.fileUrl if app.resume else "",
        ])

    filename = f"applications_export_{datetime.now().strftime('%Y%m%d_%H%M%S')}.csv"
    return Response(
        content=output.getvalue(),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename={filename}"},
    )


