"""
File storage helpers (Cloudinary + Local Filesystem Fallback).
"""
from __future__ import annotations

import io
import os
from pathlib import Path

import cloudinary
import cloudinary.uploader

from app.core.config import settings

_PDF_MAGIC = b"%PDF"
_MAX_BYTES = settings.allowed_pdf_size_mb * 1024 * 1024

_DEFAULT_UPLOADS = "/tmp/uploads" if os.path.exists("/app") else "./uploads"
LOCAL_UPLOADS_DIR = Path(os.environ.get("UPLOADS_DIR", _DEFAULT_UPLOADS))
try:
    LOCAL_UPLOADS_DIR.mkdir(parents=True, exist_ok=True)
except Exception:
    LOCAL_UPLOADS_DIR = Path("/tmp/uploads")
    LOCAL_UPLOADS_DIR.mkdir(parents=True, exist_ok=True)


def _is_cloudinary_configured() -> bool:
    name = (settings.cloudinary_cloud_name or "").strip()
    key = (settings.cloudinary_api_key or "").strip()
    secret = (settings.cloudinary_api_secret or "").strip()
    if not name or not key or not secret:
        return False
    if name in ("placeholder", "dummy", "your-cloud-name") or key in ("placeholder", "dummy", "your-api-key"):
        return False
    return True


if _is_cloudinary_configured():
    try:
        cloudinary.config(
            cloud_name=settings.cloudinary_cloud_name,
            api_key=settings.cloudinary_api_key,
            api_secret=settings.cloudinary_api_secret,
            secure=True,
        )
    except Exception:
        pass


class StorageError(Exception):
    """Raised when a file fails validation or upload."""


def validate_pdf(data: bytes) -> None:
    """
    Validates that a file is a real PDF within the size limit.
    Raises StorageError on failure.
    """
    max_bytes = settings.allowed_pdf_size_mb * 1024 * 1024
    if len(data) > max_bytes:
        raise StorageError(
            f"File exceeds the {settings.allowed_pdf_size_mb} MB limit. "
            f"Received {len(data) / (1024 * 1024):.1f} MB."
        )
    if not data.startswith(_PDF_MAGIC):
        raise StorageError(
            "Only PDF files are accepted. The file does not have a valid PDF signature."
        )


def upload_pdf(data: bytes, folder: str, public_id: str) -> dict:
    """
    Upload a validated PDF buffer to Cloudinary (if configured) or local disk.
    Returns a dict with: secure_url, public_id, bytes.
    """
    if _is_cloudinary_configured():
        try:
            result = cloudinary.uploader.upload(
                io.BytesIO(data),
                resource_type="raw",
                folder=folder,
                public_id=public_id,
                overwrite=True,
                use_filename=False,
                unique_filename=False,
            )
            return {
                "secure_url": result["secure_url"],
                "public_id": result["public_id"],
                "bytes": result.get("bytes", len(data)),
            }
        except Exception as e:
            # Fall back to local storage if Cloudinary upload fails
            pass

    # Local filesystem storage
    folder_clean = folder.strip("/").replace("..", "_")
    target_dir = LOCAL_UPLOADS_DIR / folder_clean
    target_dir.mkdir(parents=True, exist_ok=True)
    
    file_path = target_dir / f"{public_id}.pdf"
    with open(file_path, "wb") as f:
        f.write(data)

    relative_path = f"{folder_clean}/{public_id}.pdf"
    return {
        "secure_url": f"/api/v1/uploads/files/{relative_path}",
        "public_id": relative_path,
        "bytes": len(data),
    }


def get_local_file_path(relative_path: str) -> Path | None:
    """Get absolute path to a local uploaded file if it exists and is within LOCAL_UPLOADS_DIR."""
    clean_path = relative_path.lstrip("/")
    full_path = (LOCAL_UPLOADS_DIR / clean_path).resolve()
    try:
        full_path.relative_to(LOCAL_UPLOADS_DIR.resolve())
    except ValueError:
        return None
    return full_path if full_path.exists() and full_path.is_file() else None


import re

def delete_file(public_id_or_url: str) -> None:
    """Delete a file from Cloudinary or local disk by its public_id or URL."""
    if not public_id_or_url:
        return

    if "/api/v1/uploads/files/" in public_id_or_url:
        rel_path = public_id_or_url.split("/api/v1/uploads/files/")[-1]
        file_path = get_local_file_path(rel_path)
        if file_path and file_path.exists():
            try:
                file_path.unlink()
            except Exception:
                pass
        return

    if _is_cloudinary_configured() and "cloudinary.com" in public_id_or_url:
        match = re.search(r'/upload/(?:v\d+/)?(.+)$', public_id_or_url)
        if match:
            public_id = match.group(1)
            try:
                cloudinary.uploader.destroy(public_id, resource_type="raw")
            except Exception:
                pass
        return

    # Fallback if just a public_id was passed directly (legacy)
    if _is_cloudinary_configured() and not public_id_or_url.endswith(".pdf") and not public_id_or_url.startswith("http"):
        try:
            cloudinary.uploader.destroy(public_id_or_url, resource_type="raw")
        except Exception:
            pass
        return

    file_path = get_local_file_path(public_id_or_url)
    if file_path and file_path.exists():
        try:
            file_path.unlink()
        except Exception:
            pass

