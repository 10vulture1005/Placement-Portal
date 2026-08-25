"""
AES-256-GCM encryption helpers — Python port of src/lib/encryption.ts.

The encrypted format is identical to the TypeScript version so values
encrypted by the Next.js layer can be decrypted by FastAPI and vice versa:

    <iv_hex>:<auth_tag_hex>:<ciphertext_hex>

The ENCRYPTION_KEY env var must be a 64-character hexadecimal string
(32 bytes = 256 bits).
"""
from __future__ import annotations

import os
import secrets

from cryptography.hazmat.primitives.ciphers.aead import AESGCM

from app.core.config import settings

_GCM_TAG_LENGTH = 16  # bytes


def _get_key() -> bytes:
    key_hex = settings.encryption_key
    if not key_hex or len(key_hex) != 64:
        raise ValueError(
            "ENCRYPTION_KEY must be set to a 64-character hexadecimal string. "
            "Generate one with: python -c \"import secrets; print(secrets.token_hex(32))\""
        )
    return bytes.fromhex(key_hex)


def encrypt_value(plaintext: str) -> str:
    """
    Encrypt a string with AES-256-GCM.
    Returns a colon-delimited string: iv_hex:tag_hex:ciphertext_hex
    """
    iv = secrets.token_bytes(12)  # 96-bit IV, same as TypeScript
    aesgcm = AESGCM(_get_key())
    # PyCA appends the 16-byte auth tag at the END of ciphertext
    combined = aesgcm.encrypt(iv, plaintext.encode("utf-8"), None)
    ciphertext = combined[:-_GCM_TAG_LENGTH]
    tag = combined[-_GCM_TAG_LENGTH:]
    return f"{iv.hex()}:{tag.hex()}:{ciphertext.hex()}"


def decrypt_value(payload: str) -> str:
    """
    Decrypt a colon-delimited AES-256-GCM payload.
    Raises ValueError if the payload is malformed.
    """
    parts = payload.split(":")
    if len(parts) != 3:
        raise ValueError("Invalid encrypted payload — expected iv:tag:ciphertext")
    iv_hex, tag_hex, ciphertext_hex = parts
    iv = bytes.fromhex(iv_hex)
    tag = bytes.fromhex(tag_hex)
    ciphertext = bytes.fromhex(ciphertext_hex)
    aesgcm = AESGCM(_get_key())
    # PyCA expects tag appended to ciphertext
    return aesgcm.decrypt(iv, ciphertext + tag, None).decode("utf-8")


def encrypt_bytes(data: bytes, custom_key: bytes | None = None) -> bytes:
    """
    Encrypt arbitrary binary data (e.g. PDF documents) with AES-256-GCM.
    Returns: [12 bytes IV][16 bytes Tag][Ciphertext]
    """
    key = custom_key or _get_key()
    iv = secrets.token_bytes(12)
    aesgcm = AESGCM(key)
    # PyCA appends tag to ciphertext
    combined = aesgcm.encrypt(iv, data, None)
    ciphertext = combined[:-_GCM_TAG_LENGTH]
    tag = combined[-_GCM_TAG_LENGTH:]
    return iv + tag + ciphertext


def decrypt_bytes(payload: bytes, custom_key: bytes | None = None) -> bytes:
    """
    Decrypt binary AES-256-GCM data formatted as [12 bytes IV][16 bytes Tag][Ciphertext].
    """
    if len(payload) < 28:
        raise ValueError("Invalid encrypted binary payload — minimum length is 28 bytes")
    key = custom_key or _get_key()
    iv = payload[:12]
    tag = payload[12:28]
    ciphertext = payload[28:]
    aesgcm = AESGCM(key)
    return aesgcm.decrypt(iv, ciphertext + tag, None)


def is_encrypted(value: str | None) -> bool:
    """Returns True if the value looks like an encrypted payload."""
    if not value:
        return False
    parts = value.split(":")
    return len(parts) == 3 and all(len(p) > 0 for p in parts)

