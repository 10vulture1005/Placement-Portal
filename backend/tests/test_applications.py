"""Tests for Application business rules, eligibility evaluation, and resilient notifications."""
from __future__ import annotations

import pytest
from app.models.db import ApplicationStatus
from app.schemas.application import ApplicationCreate, ApplicationStatusUpdate, BulkStatusUpdate
from app.services.eligibility import (
    evaluate_eligibility,
    is_eligible,
    to_eligibility_profile,
)
from app.services.email import _is_placeholder_key, send_notification_email


def test_is_placeholder_key_detects_empty_and_dummy_keys():
    assert _is_placeholder_key("") is True
    assert _is_placeholder_key(None) is True
    assert _is_placeholder_key("placeholder") is True
    assert _is_placeholder_key("re_xxx") is True
    assert _is_placeholder_key("your-api-key") is True
    assert _is_placeholder_key("re_1234567890abcdef") is False


def test_send_notification_email_returns_none_gracefully_on_placeholder_key():
    result = send_notification_email(
        to_email="student@iiitl.ac.in",
        subject="Status Update",
        message="Your application was shortlisted.",
    )
    assert result is None


def test_eligibility_evaluation_passes_for_qualifying_student():
    checks = evaluate_eligibility(
        cgpa=8.5,
        batch=2026,
        branch="CSE",
        backlogs=0,
        bans=0,
        documents_complete=True,
        min_cgpa=7.5,
        job_batch=2026,
        allowed_branches=["CSE", "IT"],
        max_backlogs=0,
        max_bans=0,
    )
    assert is_eligible(checks) is True
    assert all(c.passed for c in checks)


def test_eligibility_evaluation_fails_when_cgpa_or_branch_mismatches():
    checks = evaluate_eligibility(
        cgpa=6.8,
        batch=2026,
        branch="ECE",
        backlogs=0,
        bans=0,
        documents_complete=True,
        min_cgpa=7.5,
        job_batch=2026,
        allowed_branches=["CSE", "IT"],
        max_backlogs=0,
        max_bans=0,
    )
    assert is_eligible(checks) is False
    failed = [c.key for c in checks if not c.passed]
    assert "cgpa" in failed
    assert "branch" in failed


def test_application_schemas_validation():
    app_create = ApplicationCreate(jobProfileId="job-1", resumeId="res-1")
    assert app_create.jobProfileId == "job-1"
    assert app_create.resumeId == "res-1"

    status_update = ApplicationStatusUpdate(status=ApplicationStatus.SHORTLISTED)
    assert status_update.status == ApplicationStatus.SHORTLISTED

    bulk_update = BulkStatusUpdate(
        applicationIds=["app-1", "app-2"],
        status=ApplicationStatus.SELECTED,
    )
    assert len(bulk_update.applicationIds) == 2
    assert bulk_update.status == ApplicationStatus.SELECTED
