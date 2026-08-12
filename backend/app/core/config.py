from __future__ import annotations

import os
from typing import Any

from pydantic import field_validator
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    # Database — same connection string as Next.js, but with asyncpg driver
    database_url: str = "postgresql+asyncpg://postgres:postgres@localhost:5432/tnp_portal"

    # Auth.js JWT secret — must match AUTH_SECRET in Next.js .env
    auth_secret: str = "tnp-local-development-secret-change-before-production"

    # AES-256-GCM encryption key — must match ENCRYPTION_KEY in Next.js .env (64-char hex)
    encryption_key: str = ""

    # Cloudinary (file storage)
    cloudinary_cloud_name: str = ""
    cloudinary_api_key: str = ""
    cloudinary_api_secret: str = ""

    # Resend (email)
    resend_api_key: str = ""
    email_from: str = "placements@iiitl.ac.in"

    # CORS — comma-separated or JSON array
    cors_origins: list[str] = ["http://localhost:3000"]

    # Upload limits
    allowed_pdf_size_mb: int = 5
    max_resumes_per_student: int = 5

    # Environment
    environment: str = "development"

    @field_validator("database_url", mode="before")
    @classmethod
    def fix_database_url(cls, v: Any) -> str:
        """Convert prisma-style postgres:// URLs to asyncpg-compatible ones."""
        v = str(v)
        if v.startswith("postgresql://"):
            v = v.replace("postgresql://", "postgresql+asyncpg://", 1)
        if v.startswith("postgres://"):
            v = v.replace("postgres://", "postgresql+asyncpg://", 1)
        return v

    model_config = {
        "env_file": "../.env",
        "env_file_encoding": "utf-8",
        "extra": "ignore",
    }


settings = Settings()
