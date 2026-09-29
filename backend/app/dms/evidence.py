"""Validate, encrypt, extract and verify immutable evidence versions."""
import hashlib
import hmac
import io
import base64
import re
import secrets
import zipfile
from pathlib import Path
from xml.etree import ElementTree

from cryptography.hazmat.primitives.ciphers.aead import AESGCM
from fastapi import HTTPException, UploadFile

from app.core.config import settings
from app.dms.models import DocumentVersion
from app.dms.security import master_key


MIME = {
    ".pdf": "application/pdf",
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".txt": "text/plain",
    ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
}


def validate(name: str, data: bytes) -> tuple[str, str]:
    filename = Path(name.replace("\\", "/")).name[:240]
    suffix = Path(filename).suffix.lower()
    if suffix not in MIME:
        raise HTTPException(422, "Use PDF, DOCX, TXT, PNG or JPEG files.")
    if not data or len(data) > settings.max_upload_bytes:
        raise HTTPException(422, f"File must be between 1 byte and {settings.max_upload_mb} MB.")
    signatures = {".pdf": b"%PDF-", ".png": b"\x89PNG\r\n\x1a\n", ".jpg": b"\xff\xd8\xff", ".jpeg": b"\xff\xd8\xff", ".docx": b"PK\x03\x04"}
    if suffix in signatures and not data.startswith(signatures[suffix]):
        raise HTTPException(422, "File content does not match its extension.")
    if suffix == ".txt":
        try:
            data.decode("utf-8")
        except UnicodeDecodeError as exc:
            raise HTTPException(422, "Text files must use UTF-8.") from exc
    if suffix == ".docx":
        try:
            with zipfile.ZipFile(io.BytesIO(data)) as archive:
                info = archive.getinfo("word/document.xml")
                if info.file_size > 3_000_000:
                    raise ValueError("Document text is too large")
        except (zipfile.BadZipFile, KeyError, ValueError) as exc:
            raise HTTPException(422, "Invalid DOCX file.") from exc
    return filename, MIME[suffix]


def extract_text(filename: str, data: bytes) -> tuple[str, str]:
    suffix = Path(filename).suffix.lower()
    try:
        if suffix == ".txt":
            return data.decode("utf-8")[:50_000], "extracted"
        if suffix == ".pdf":
            import pymupdf
            with pymupdf.open(stream=data, filetype="pdf") as pdf:
                text = "\n".join(pdf[index].get_text() for index in range(min(pdf.page_count, 40)))
                if not text.strip():
                    from PIL import Image
                    import pytesseract

                    pages = []
                    for index in range(min(pdf.page_count, 5)):
                        pixmap = pdf[index].get_pixmap(matrix=pymupdf.Matrix(1.5, 1.5), alpha=False)
                        if pixmap.width * pixmap.height > 8_000_000:
                            continue
                        image = Image.frombytes("RGB", (pixmap.width, pixmap.height), pixmap.samples)
                        pages.append(pytesseract.image_to_string(image))
                    text = "\n".join(pages)
            return text[:50_000], "extracted" if text.strip() else "no_text"
        if suffix == ".docx":
            with zipfile.ZipFile(io.BytesIO(data)) as archive:
                root = ElementTree.fromstring(archive.read("word/document.xml"))
            parts = [node.text or "" for node in root.iter() if node.tag.endswith("}t")]
            text = " ".join(parts)[:50_000]
            return text, "extracted" if text.strip() else "no_text"
        if suffix in {".png", ".jpg", ".jpeg"}:
            import pytesseract
            from PIL import Image
            text = pytesseract.image_to_string(Image.open(io.BytesIO(data)))[:50_000]
            return text, "extracted" if text.strip() else "no_text"
    except Exception:
        return "", "unavailable"
    return "", "unavailable"


def encrypt_text(value: str) -> str:
    if not value:
        return ""
    nonce = secrets.token_bytes(12)
    ciphertext = AESGCM(master_key()).encrypt(nonce, value.encode("utf-8"), b"casevault-extracted-text")
    return "enc:v1:" + base64.b64encode(nonce + ciphertext).decode("ascii")


def decrypt_text(value: str) -> str:
    if not value:
        return ""
    if not value.startswith("enc:v1:"):
        raise RuntimeError("Unencrypted extracted text requires migration")
    payload = base64.b64decode(value[7:])
    return AESGCM(master_key()).decrypt(payload[:12], payload[12:], b"casevault-extracted-text").decode("utf-8")


def search_tokens(value: str) -> set[str]:
    words = set(re.findall(r"[a-z0-9]{3,40}", value.lower()))
    return {hmac.new(master_key(), f"search:{word}".encode(), hashlib.sha256).hexdigest() for word in list(words)[:3000]}


def storage_path(storage_key: str) -> Path:
    if not storage_key.endswith(".vault") or len(storage_key) != 38 or not all(ch in "0123456789abcdef" for ch in storage_key[:-6]):
        raise RuntimeError("Invalid evidence storage key")
    return settings.upload_dir / "vault" / storage_key


async def prepare(upload: UploadFile) -> tuple[str, str, bytes, str, str, str]:
    data = await upload.read(settings.max_upload_bytes + 1)
    filename, mime = validate(upload.filename or "", data)
    digest = hashlib.sha256(data).hexdigest()
    text, status = extract_text(filename, data)
    return filename, mime, data, digest, text, status


def store(data: bytes) -> str:
    key = f"{secrets.token_hex(16)}.vault"
    target = storage_path(key)
    target.parent.mkdir(parents=True, exist_ok=True)
    nonce = secrets.token_bytes(12)
    encrypted = nonce + AESGCM(master_key()).encrypt(nonce, data, None)
    with target.open("xb") as stream:
        stream.write(encrypted)
    return key


def read(version: DocumentVersion) -> bytes:
    try:
        encrypted = storage_path(version.storage_key).read_bytes()
        data = AESGCM(master_key()).decrypt(encrypted[:12], encrypted[12:], None)
    except Exception as exc:
        raise HTTPException(409, "Evidence file failed integrity verification or is unavailable.") from exc
    if not hashlib.sha256(data).hexdigest() == version.sha256:
        raise HTTPException(409, "Evidence file hash does not match its recorded version.")
    return data
