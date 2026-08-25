"""Tests for Announcement schemas, category parsing, and permissions."""
from __future__ import annotations

import pytest
from datetime import datetime
from pydantic import ValidationError

from app.core.security import (
    PERM_ANNOUNCEMENTS_MANAGE,
    compute_effective_permissions,
    has_permission,
)
from app.models.db import Announcement, AnnouncementCategory, Company, User
from app.routers.announcements import _parse_category, _to_announcement_response
from app.schemas.announcement import (
    AnnouncementCreate,
    AnnouncementResponse,
    AnnouncementUpdate,
)


def test_parse_category_valid_and_case_insensitive():
    assert _parse_category("GENERAL") == AnnouncementCategory.GENERAL
    assert _parse_category("general") == AnnouncementCategory.GENERAL
    assert _parse_category("COMPANY_EVENT") == AnnouncementCategory.COMPANY_EVENT
    assert _parse_category("Company Event") == AnnouncementCategory.COMPANY_EVENT
    assert _parse_category("company_event") == AnnouncementCategory.COMPANY_EVENT


def test_parse_category_invalid_raises_http_exception():
    with pytest.raises(Exception) as exc_info:
        _parse_category("INVALID_CAT")
    assert "Invalid category" in str(exc_info.value)


def test_announcement_create_schema_valid():
    payload = {
        "title": "Google Placement Drive 2026",
        "content": "Google will be visiting campus for 2026 batch recruitment.",
        "category": "COMPANY_EVENT",
        "tags": ["Drive", "Shortlist"],
        "companyId": "comp_123",
    }
    schema = AnnouncementCreate(**payload)
    assert schema.title == "Google Placement Drive 2026"
    assert schema.category == "COMPANY_EVENT"
    assert len(schema.tags) == 2


def test_announcement_create_schema_rejects_short_title():
    with pytest.raises(ValidationError):
        AnnouncementCreate(
            title="A",  # Less than 2 chars
            content="Valid content description",
            category="GENERAL",
        )


def test_announcement_update_schema_allows_partial_fields():
    update = AnnouncementUpdate(title="Updated Title")
    assert update.title == "Updated Title"
    assert update.content is None
    assert update.category is None


def test_to_announcement_response_formatting():
    company = Company(
        id="c1",
        name="Google",
        logoUrl="https://example.com/logo.png",
        website="https://google.com",
    )
    user = User(
        id="u1",
        name="Admin User",
        email="admin@iiitl.ac.in",
    )
    announcement = Announcement(
        id="a1",
        title="Campus Drive",
        content="Recruitment details here.",
        category=AnnouncementCategory.COMPANY_EVENT,
        tags=["Drive", "Assessment"],
        companyId="c1",
        createdById="u1",
        createdAt=datetime.now(),
    )
    announcement.company = company
    announcement.created_by = user

    resp = _to_announcement_response(announcement)
    assert resp.id == "a1"
    assert resp.title == "Campus Drive"
    assert resp.category == "COMPANY_EVENT"
    assert resp.company is not None
    assert resp.company.name == "Google"
    assert resp.createdByName == "Admin User"
    assert resp.createdByEmail == "admin@iiitl.ac.in"


def test_announcement_manage_permission_hierarchy():
    super_admin_perms = compute_effective_permissions("SUPER_ADMIN")
    assert PERM_ANNOUNCEMENTS_MANAGE in super_admin_perms

    admin_perms = compute_effective_permissions("ADMIN")
    assert PERM_ANNOUNCEMENTS_MANAGE in admin_perms

    officer_perms = compute_effective_permissions("OFFICER")
    assert PERM_ANNOUNCEMENTS_MANAGE in officer_perms

    coordinator_perms = compute_effective_permissions("COORDINATOR")
    assert PERM_ANNOUNCEMENTS_MANAGE in coordinator_perms

    student_perms = compute_effective_permissions("STUDENT")
    assert PERM_ANNOUNCEMENTS_MANAGE not in student_perms

    custom_student = compute_effective_permissions("STUDENT", custom_permissions=[PERM_ANNOUNCEMENTS_MANAGE])
    assert PERM_ANNOUNCEMENTS_MANAGE in custom_student


def test_announcement_update_fields_set_detection():
    # When companyId is explicitly passed as None vs omitted
    update_with_none = AnnouncementUpdate(companyId=None)
    assert "companyId" in update_with_none.model_fields_set
    assert update_with_none.companyId is None

    update_omitted = AnnouncementUpdate(title="New Title")
    assert "companyId" not in update_omitted.model_fields_set
    assert "title" in update_omitted.model_fields_set

