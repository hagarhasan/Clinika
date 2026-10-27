"""رفع الصور على Cloudinary (Vercel مفيهوش تخزين ثابت)."""
import hashlib
import time

import httpx
from fastapi import HTTPException

from ..config import settings


def detect_image_type(data: bytes) -> str | None:
    if data.startswith(b"\xff\xd8\xff"):
        return "jpeg"
    if data.startswith(b"\x89PNG\r\n\x1a\n"):
        return "png"
    if data[:4] == b"RIFF" and data[8:12] == b"WEBP":
        return "webp"
    return None


def upload_image(data: bytes, folder: str) -> dict:
    if not settings.cloudinary_enabled:
        raise HTTPException(status_code=503, detail="Image uploads are not configured")
    if len(data) > settings.MAX_UPLOAD_MB * 1024 * 1024:
        raise HTTPException(status_code=413, detail=f"Image is larger than {settings.MAX_UPLOAD_MB} MB")
    if detect_image_type(data) is None:
        raise HTTPException(status_code=400, detail="Only JPEG, PNG or WebP images are allowed")

    timestamp = int(time.time())
    to_sign = f"folder={folder}&timestamp={timestamp}{settings.CLOUDINARY_API_SECRET}"
    signature = hashlib.sha1(to_sign.encode("utf-8")).hexdigest()
    try:
        r = httpx.post(
            f"https://api.cloudinary.com/v1_1/{settings.CLOUDINARY_CLOUD_NAME}/image/upload",
            data={"api_key": settings.CLOUDINARY_API_KEY, "timestamp": timestamp, "folder": folder, "signature": signature},
            files={"file": ("upload", data)},
            timeout=20.0,
        )
    except httpx.HTTPError:
        raise HTTPException(status_code=502, detail="Image upload failed")
    if r.status_code >= 300:
        raise HTTPException(status_code=502, detail="Image upload failed")
    body = r.json()
    return {"url": body["secure_url"], "public_id": body.get("public_id")}


def validate_image_url(url: str | None) -> str | None:
    """بنقبل بس روابط من حساب Cloudinary بتاعنا (عشان محدش يحط روابط خارجية)."""
    if not url:
        return None
    if not settings.cloudinary_enabled:
        raise HTTPException(status_code=400, detail="Image uploads are not configured")
    if not url.startswith(f"https://res.cloudinary.com/{settings.CLOUDINARY_CLOUD_NAME}/"):
        raise HTTPException(status_code=400, detail="Image URL must come from the Clinika image upload")
    return url
