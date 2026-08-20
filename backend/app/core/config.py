from __future__ import annotations

from functools import cached_property
from typing import Any

from pydantic import field_validator
from pydantic_settings import BaseSettings


def _split_csv(value: str) -> list[str]:
    return [item.strip() for item in value.split(",") if item.strip()]


class Settings(BaseSettings):
    # Database — same connection string as Prisma, but with the asyncpg driver
    database_url: str = "postgresql+asyncpg://postgres:postgres@localhost:5432/tnp_portal"

    # Auth.js JWT secret — must match AUTH_SECRET used by the frontend
    auth_secret: str = "tnp-local-development-secret-change-before-production"

    # AES-256-GCM encryption key — must match ENCRYPTION_KEY in the frontend (64-char hex)
    encryption_key: str = ""

    # Access control. ADMIN_EMAILS is the only source of administrator access;
    # every other account is a student and must belong to the institute domain.
    admin_emails: str = ""
    student_email_domain: str = "iiitl.ac.in"

    # Cloudinary (file storage)
    cloudinary_cloud_name: str = ""
    cloudinary_api_key: str = ""
    cloudinary_api_secret: str = ""

    # Resend (email)
    resend_api_key: str = ""
    email_from: str = "placements@iiitl.ac.in"

    # CORS — comma-separated list of allowed browser origins
    cors_origins: str = "http://localhost:3000"

    # Upload limits
    allowed_pdf_size_mb: int = 5
    max_resumes_per_student: int = 5

    # Environment
    environment: str = "development"

    @field_validator("database_url", mode="before")
    @classmethod
    def fix_database_url(cls, v: Any) -> str:
        """Convert Prisma-style postgres:// URLs to asyncpg-compatible ones."""
        v = str(v)
        if v.startswith("postgresql://"):
            v = v.replace("postgresql://", "postgresql+asyncpg://", 1)
        if v.startswith("postgres://"):
            v = v.replace("postgres://", "postgresql+asyncpg://", 1)
        return v

    @cached_property
    def cors_origin_list(self) -> list[str]:
        return _split_csv(self.cors_origins)

    @cached_property
    def admin_email_set(self) -> frozenset[str]:
        return frozenset(email.lower() for email in _split_csv(self.admin_emails))

    @cached_property
    def normalized_student_domain(self) -> str:
        return self.student_email_domain.strip().lstrip("@").lower()

    @property
    def is_production(self) -> bool:
        return self.environment.lower() == "production"

    model_config = {
        # In Docker the values arrive as real environment variables; the file
        # lookups only matter when running uvicorn directly on a developer machine.
        "env_file": (".env", "../.env"),
        "env_file_encoding": "utf-8",
        "extra": "ignore",
    }


settings = Settings()
