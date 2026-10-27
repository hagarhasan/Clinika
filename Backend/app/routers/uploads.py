from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from sqlalchemy.orm import Session

from ..config import settings
from ..database import get_db
from ..deps import get_current_user, require_roles
from ..models import Role, User
from ..schemas import UserOut
from ..services.storage import upload_image

router = APIRouter(prefix="/uploads", tags=["Uploads"])


async def _read(file: UploadFile) -> bytes:
    limit = settings.MAX_UPLOAD_MB * 1024 * 1024
    data = await file.read(limit + 1)  # بنقرا حد أقصى ونتحقق (Vercel بيرفض أكتر من ~4.5MB أصلًا)
    if len(data) > limit:
        raise HTTPException(status_code=413, detail=f"Image is larger than {settings.MAX_UPLOAD_MB} MB")
    return data


@router.post("/avatar", response_model=UserOut)
async def upload_avatar(
    file: UploadFile = File(...),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """يرفع الصورة الشخصية ويحطها على حساب المستخدم (مريض/دكتور/أدمن)."""
    result = upload_image(await _read(file), f"clinika/avatars/{user.role}")
    user.avatar_url = result["url"]
    db.commit()
    return user


@router.post("/image")
async def upload_generic_image(
    file: UploadFile = File(...),
    _: User = Depends(require_roles(Role.admin)),
):
    """رفع صورة عامة (مثلًا صورة عيادة). بيرجّع الرابط، والأدمن يحطه في PUT /clinics/{id} كـ photo_url."""
    return upload_image(await _read(file), "clinika/clinics")
