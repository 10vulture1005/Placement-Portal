"""Tests for NOC schemas, permissions, and response formatting."""
from __future__ import annotations

from datetime import datetime, timedelta
import pytest
from pydantic import ValidationError

from app.core.security import (
    PERM_NOC_MANAGE,
    compute_effective_permissions,
    has_permission,
)
from app.models.db import NocRequest, NocStatus, User
from app.routers.noc import _to_admin_noc_response
from app.schemas.noc import (
    AdminNocResponse,
    NocApproveRequest,
    NocCreate,
    NocMetricsResponse,
    NocRejectRequest,
    NocResponse,
)


def test_noc_create_schema_valid():
    start = datetime.now()
    end = start + timedelta(days=90)
    data = {
        "company": "Amazon India",
        "address": "Brigade Gateway, World Trade Centre",
        "city": "Bengaluru",
        "state": "Karnataka",
        "pincode": "560055",
        "startDate": start,
        "endDate": end,
        "message": "Summer SDE internship",
    }
    schema = NocCreate(**data)
    assert schema.company == "Amazon India"
    assert schema.pincode == "560055"
    assert schema.endDate >= schema.startDate


def test_noc_create_schema_rejects_end_date_before_start_date():
    start = datetime.now()
    end = start - timedelta(days=5)
    with pytest.raises(ValidationError) as exc_info:
        NocCreate(
            company="Google",
            address="RMZ Infinity",
            city="Bengaluru",
            state="Karnataka",
            pincode="560016",
            startDate=start,
            endDate=end,
        )
    assert "End date cannot be earlier than start date" in str(exc_info.value)


def test_noc_create_schema_rejects_invalid_pincode():
    start = datetime.now()
    end = start + timedelta(days=30)
    with pytest.raises(ValidationError):
        NocCreate(
            company="Microsoft",
            address="Prestige Ferns Galaxy",
            city="Bengaluru",
            state="Karnataka",
            pincode="5600A5",  # Invalid non-digit
            startDate=start,
            endDate=end,
        )


def test_noc_manage_permission_hierarchy():
    super_admin_perms = compute_effective_permissions("SUPER_ADMIN")
    assert PERM_NOC_MANAGE in super_admin_perms

    admin_perms = compute_effective_permissions("ADMIN")
    assert PERM_NOC_MANAGE in admin_perms

    officer_perms = compute_effective_permissions("OFFICER")
    assert PERM_NOC_MANAGE in officer_perms

    coordinator_perms = compute_effective_permissions("COORDINATOR")
    assert PERM_NOC_MANAGE not in coordinator_perms

    student_perms = compute_effective_permissions("STUDENT")
    assert PERM_NOC_MANAGE not in student_perms

    custom_coord = compute_effective_permissions("COORDINATOR", custom_permissions=[PERM_NOC_MANAGE])
    assert PERM_NOC_MANAGE in custom_coord


def test_to_admin_noc_response_formatting():
    now = datetime.now()
    user = User(
        id="usr_123",
        name="Arjun Desai",
        email="arjun@iiitl.ac.in",
        rollNumber="LCS2023001",
        branch="CS",
        batch=2027,
        cgpa=8.95,
        contactNumber="+91 9876543210",
    )
    noc = NocRequest(
        id="noc_456",
        userId="usr_123",
        company="Postman",
        address="Golf Course Road",
        city="Bengaluru",
        state="Karnataka",
        pincode="560103",
        startDate=now,
        endDate=now + timedelta(days=180),
        status=NocStatus.APPROVED,
        message="Off-campus internship",
        documentUrl="/api/v1/uploads/files/noc_docs/cert_123.pdf",
        createdAt=now,
        updatedAt=now,
    )
    noc.user = user

    resp = _to_admin_noc_response(noc)
    assert resp.id == "noc_456"
    assert resp.status == "APPROVED"
    assert resp.company == "Postman"
    assert resp.student is not None
    assert resp.student.name == "Arjun Desai"
    assert resp.student.rollNumber == "LCS2023001"
    assert resp.student.cgpa == 8.95
    assert resp.documentUrl == "/api/v1/uploads/files/noc_docs/cert_123.pdf"
