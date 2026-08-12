"""
File storage helpers (Cloudinary).
Swap out _upload_to_cloudinary / _delete_from_cloudinary to use S3 instead.
"""
from __future__ import annotations

import io

import cloudinary
import cloudinary.uploader

from app.core.config import settings

_PDF_MAGIC = b"%PDF"
_MAX_BYTES = settings.allowed_pdf_size_mb * 1024 * 1024

# Configure Cloudinary on import
cloudinary.config(
    cloud_name=settings.cloudinary_cloud_name,
    api_key=settings.cloudinary_api_key,
    api_secret=settings.cloudinary_api_secret,
    secure=True,
)


class StorageError(Exception):
    """Raised when a file fails validation or upload."""


def validate_pdf(data: bytes) -> None:
    """
    Validates that a file is a real PDF within the size limit.
    Raises StorageError on failure.
    """
    if len(data) > _MAX_BYTES:
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
    Upload a validated PDF buffer to Cloudinary.
    Returns a dict with: secure_url, public_id, bytes.
    """
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


def delete_file(public_id: str) -> None:
    """Delete a file from Cloudinary by its public_id."""
    cloudinary.uploader.destroy(public_id, resource_type="raw")
