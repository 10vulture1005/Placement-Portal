"""Tests for file storage helpers, PDF validation, local fallback, and security checks."""
from __future__ import annotations

import pytest
from app.core.storage import (
    StorageError,
    validate_pdf,
    upload_pdf,
    get_local_file_path,
    delete_file,
)
from app.core.encryption import encrypt_value, decrypt_value, is_encrypted


def test_validate_pdf_accepts_valid_pdf_buffer():
    valid_pdf = b"%PDF-1.4\n1 0 obj\n<<>>\nendobj\ntrailer\n<<>>\n%%EOF"
    # Should not raise
    validate_pdf(valid_pdf)


def test_validate_pdf_rejects_non_pdf_file():
    non_pdf = b"GIF89a\x01\x00\x01\x00\x00\x00\x00!"
    with pytest.raises(StorageError) as exc:
        validate_pdf(non_pdf)
    assert "Only PDF files are accepted" in str(exc.value)


def test_validate_pdf_rejects_oversized_file(monkeypatch):
    from app.core.config import settings
    monkeypatch.setattr(settings, "allowed_pdf_size_mb", 1)
    large_data = b"%PDF" + b"0" * (2 * 1024 * 1024)
    with pytest.raises(StorageError) as exc:
        validate_pdf(large_data)
    assert "File exceeds" in str(exc.value)


def test_local_storage_upload_get_and_delete(tmp_path, monkeypatch):
    import app.core.storage as storage_mod
    monkeypatch.setattr(storage_mod, "LOCAL_UPLOADS_DIR", tmp_path)
    monkeypatch.setattr(storage_mod, "_is_cloudinary_configured", lambda: False)

    sample_pdf = b"%PDF-1.4 sample content"
    result = upload_pdf(sample_pdf, folder="resumes/user_123", public_id="resume_abc")

    assert "secure_url" in result
    assert result["public_id"] == "resumes/user_123/resume_abc.pdf"

    # Verify file exists on disk
    file_path = get_local_file_path("resumes/user_123/resume_abc.pdf")
    assert file_path is not None
    assert file_path.exists()
    assert file_path.read_bytes() == sample_pdf

    # Test path traversal protection
    assert get_local_file_path("../../etc/passwd") is None

    # Test delete
    delete_file("resumes/user_123/resume_abc.pdf")
    assert not file_path.exists()


def test_sensitive_identity_encryption():
    aadhaar = "123456789012"
    encrypted = encrypt_value(aadhaar)
    assert is_encrypted(encrypted) is True
    assert decrypt_value(encrypted) == aadhaar

    pan = "ABCDE1234F"
    encrypted_pan = encrypt_value(pan)
    assert is_encrypted(encrypted_pan) is True
    assert decrypt_value(encrypted_pan) == pan


def test_binary_document_encryption():
    from app.core.encryption import encrypt_bytes, decrypt_bytes

    sample_doc = b"%PDF-1.4 sample secure document %%EOF"
    encrypted = encrypt_bytes(sample_doc)
    assert encrypted != sample_doc
    assert len(encrypted) >= 28 + len(sample_doc)

    decrypted = decrypt_bytes(encrypted)
    assert decrypted == sample_doc

    with pytest.raises(ValueError) as exc:
        decrypt_bytes(b"short")
    assert "minimum length is 28 bytes" in str(exc.value)


@pytest.mark.asyncio
async def test_get_uploaded_file_path_traversal_and_auth():
    from fastapi import HTTPException
    from app.routers.uploads import get_uploaded_file

    # Traversal attempt with ..
    with pytest.raises(HTTPException) as exc:
        await get_uploaded_file(
            file_path="resumes/user1/../../resumes/user2/secret.pdf",
            token_payload={"sub": "user1", "role": "STUDENT"},
        )
    assert exc.value.status_code == 400

    # Cross-user access attempt
    with pytest.raises(HTTPException) as exc:
        await get_uploaded_file(
            file_path="resumes/user2/secret.pdf",
            token_payload={"sub": "user1", "role": "STUDENT"},
        )
    assert exc.value.status_code in (403, 404)


