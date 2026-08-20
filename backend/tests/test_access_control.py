"""Access-control rules: ADMIN_EMAILS is the only source of admin rights."""
from __future__ import annotations

import pytest
from fastapi import HTTPException
from jose import jwt

from app.core import security
from app.core.config import Settings


def build_settings(**overrides) -> Settings:
    base = {
        "admin_emails": "",
        "student_email_domain": "iiitl.ac.in",
        "auth_secret": "test-secret",
        "cors_origins": "http://localhost:3000",
    }
    base.update(overrides)
    return Settings(**base)


@pytest.fixture
def configured(monkeypatch):
    """Swap the module-level settings singleton used by the security helpers."""

    def _apply(**overrides) -> Settings:
        replacement = build_settings(**overrides)
        monkeypatch.setattr(security, "settings", replacement)
        return replacement

    return _apply


def test_admin_emails_parse_into_a_normalized_set():
    settings = build_settings(admin_emails=" Head@IIITL.ac.in , ops@example.com , ")
    assert settings.admin_email_set == frozenset({"head@iiitl.ac.in", "ops@example.com"})


def test_empty_admin_emails_means_nobody_is_an_admin(configured):
    configured(admin_emails="")
    assert security.is_admin_email("placements@iiitl.ac.in") is False
    assert security.is_admin_email("") is False


def test_listed_external_account_is_an_admin(configured):
    configured(admin_emails="external@gmail.com")
    assert security.is_admin_email("external@gmail.com") is True
    assert security.is_admin_email("someone-else@gmail.com") is False


def test_student_domain_match_is_exact(configured):
    configured()
    assert security.is_student_email("student@iiitl.ac.in") is True
    assert security.is_student_email("attacker@notiiitl.ac.in") is False
    assert security.is_student_email("attacker@sub.iiitl.ac.in") is False
    assert security.is_student_email("no-at-sign") is False


def test_cors_origins_split_on_commas():
    settings = build_settings(cors_origins="http://localhost:3000, https://tnp.iiitl.ac.in")
    assert settings.cors_origin_list == ["http://localhost:3000", "https://tnp.iiitl.ac.in"]


def test_prisma_url_is_rewritten_for_asyncpg():
    settings = build_settings(database_url="postgresql://u:p@db:5432/tnp")
    assert settings.database_url == "postgresql+asyncpg://u:p@db:5432/tnp"


def _token(secret: str, **claims) -> str:
    return jwt.encode(claims, secret, algorithm="HS256")


def test_unlisted_external_account_is_rejected_even_with_a_valid_token(configured):
    settings = configured(admin_emails="")
    payload = jwt.decode(
        _token(settings.auth_secret, sub="1", email="outsider@gmail.com", role="STUDENT"),
        settings.auth_secret,
        algorithms=["HS256"],
    )
    assert payload["email"] == "outsider@gmail.com"
    assert security.is_student_email(payload["email"]) is False
    assert security.is_admin_email(payload["email"]) is False


def test_require_admin_rejects_a_stale_admin_claim(configured):
    """A token minted while the address was listed must stop working once it is removed."""
    configured(admin_emails="")
    with pytest.raises(HTTPException) as excinfo:
        security.require_admin({"sub": "1", "email": "former-admin@gmail.com", "role": "ADMIN"})
    assert excinfo.value.status_code == 403


def test_require_admin_accepts_a_currently_listed_admin(configured):
    configured(admin_emails="boss@iiitl.ac.in")
    payload = {"sub": "1", "email": "boss@iiitl.ac.in", "role": "ADMIN"}
    assert security.require_admin(payload) is payload


def test_require_student_rejects_an_admin_role(configured):
    configured()
    with pytest.raises(HTTPException) as excinfo:
        security.require_student({"sub": "1", "email": "boss@iiitl.ac.in", "role": "ADMIN"})
    assert excinfo.value.status_code == 403


def test_invalid_signature_is_unauthorized(configured):
    settings = configured()
    forged = _token("wrong-secret", sub="1", email="student@iiitl.ac.in", role="STUDENT")
    with pytest.raises(HTTPException) as excinfo:
        security._decode_token(forged)
    assert excinfo.value.status_code == 401
    assert settings.auth_secret == "test-secret"
