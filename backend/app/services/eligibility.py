"""
Eligibility engine — Python port of src/lib/eligibility.ts and src/lib/student-profile.ts.
Logic is identical so unit tests pass with the same test vectors.
"""
from __future__ import annotations

from dataclasses import dataclass


@dataclass
class EligibilityCheck:
    key: str
    label: str
    passed: bool


def evaluate_eligibility(
    *,
    cgpa: float,
    batch: int,
    branch: str,
    backlogs: int,
    bans: int,
    documents_complete: bool,
    min_cgpa: float,
    job_batch: int,
    allowed_branches: list[str],
    max_backlogs: int,
    max_bans: int = 0,
) -> list[EligibilityCheck]:
    return [
        EligibilityCheck(
            key="cgpa",
            label=f"CGPA {cgpa} >= {min_cgpa}",
            passed=cgpa >= min_cgpa,
        ),
        EligibilityCheck(
            key="batch",
            label=f"Batch {batch}",
            passed=batch == job_batch,
        ),
        EligibilityCheck(
            key="branch",
            label=f"Branch {branch}",
            passed=branch in allowed_branches,
        ),
        EligibilityCheck(
            key="backlogs",
            label=f"Backlogs {backlogs} <= {max_backlogs}",
            passed=backlogs <= max_backlogs,
        ),
        EligibilityCheck(
            key="bans",
            label=f"Bans {bans} <= {max_bans}",
            passed=bans <= max_bans,
        ),
        EligibilityCheck(
            key="documents",
            label="Profile documents complete",
            passed=documents_complete,
        ),
    ]


def is_eligible(checks: list[EligibilityCheck]) -> bool:
    return all(c.passed for c in checks)


# ---------------------------------------------------------------------------
# Profile completeness (mirrors src/lib/student-profile.ts)
# ---------------------------------------------------------------------------

_COMPLETION_FIELDS = [
    "name",
    "roll_number",
    "branch",
    "batch",
    "degree",
    "personal_email",
    "contact_number",
    "current_address",
    "class10_percent",
    "class12_percent",
    "cgpa",
]


def calculate_profile_completion(profile: dict) -> int:
    """
    Returns profile completion percentage (0-100).
    Profile dict keys should be snake_case matching _COMPLETION_FIELDS.
    """
    completed = sum(
        1
        for field in _COMPLETION_FIELDS
        if profile.get(field) not in (None, "", [])
    )
    return round((completed / len(_COMPLETION_FIELDS)) * 100)


def to_eligibility_profile(user, resume_count: int) -> dict | None:
    """
    Convert a User ORM object to an eligibility dict.
    Returns None if the profile is incomplete (missing cgpa/batch/branch).
    """
    if user.cgpa is None or user.batch is None or not user.branch:
        return None
    return {
        "cgpa": user.cgpa,
        "batch": user.batch,
        "branch": user.branch,
        "backlogs": user.backlogs,
        "bans": user.bans,
        "documents_complete": bool(
            user.aadhaarEncrypted and user.panCardEncrypted and resume_count > 0
        ),
    }
