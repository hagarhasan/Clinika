from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException, Query, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy import func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from ..config import settings
from ..database import get_db
from ..deps import get_current_user
from ..models import Clinic, Doctor, DoctorStatus, PasswordResetToken, Patient, Role, Specialty, User
from ..schemas import (
    AccessTokenOut,
    ChangePasswordIn,
    DoctorRegisterIn,
    DoctorRequestOut,
    ForgotPasswordIn,
    LoginIn,
    RegisterIn,
    ResetPasswordIn,
    TokenOut,
    UserOut,
    UserUpdate,
)
from ..security import create_access_token, hash_password, hash_token, verify_password
from ..services.doctors import set_doctor_status
from ..services.email import send_password_reset_email
from ..services.notifications import log_activity, notify_admins
from ..services.passwords import aware, issue_reset_token
from ..services.storage import validate_image_url

router = APIRouter(prefix="/auth", tags=["Auth"])


def _authenticate(db: Session, email: str, password: str) -> User:
    user = db.scalar(select(User).where(User.email == email.lower()))
    if user is None or not verify_password(password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Incorrect email or password")
    if not user.is_active:
        raise HTTPException(status_code=403, detail="Account is deactivated")
    if user.role == Role.doctor.value:
        doctor = db.scalar(select(Doctor).where(Doctor.user_id == user.id))
        if doctor and doctor.status == DoctorStatus.pending.value:
            raise HTTPException(status_code=403, detail="Your doctor account is pending admin approval")
        if doctor and doctor.status == DoctorStatus.rejected.value:
            raise HTTPException(status_code=403, detail="Your doctor application was not approved")
    return user


def _token_for(user: User, remember_me: bool = False) -> str:
    minutes = settings.REMEMBER_ME_EXPIRE_DAYS * 24 * 60 if remember_me else None
    return create_access_token(user.id, user.role, user.token_version or 0, minutes)


@router.post("/register", response_model=TokenOut, status_code=status.HTTP_201_CREATED)
def register(payload: RegisterIn, db: Session = Depends(get_db)):
    """تسجيل مريض جديد (الأطباء والأدمن بيتعملوا من لوحة الإدارة)."""
    email = payload.email.lower()
    if db.scalar(select(User.id).where(User.email == email)):
        raise HTTPException(status_code=409, detail="Email is already registered")

    user = User(
        email=email,
        hashed_password=hash_password(payload.password),
        first_name=payload.first_name.strip(),
        last_name=payload.last_name.strip(),
        full_name=f"{payload.first_name.strip()} {payload.last_name.strip()}",
        phone=payload.phone,
        role=Role.patient.value,
    )
    db.add(user)
    try:
        db.flush()
        db.add(Patient(user_id=user.id, date_of_birth=payload.date_of_birth, gender=payload.gender))
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=409, detail="Email is already registered")

    log_activity(db, user.id, "patient_registered", "user", user.id, f"New patient registered: {user.full_name}")
    db.commit()
    return TokenOut(access_token=_token_for(user), user=UserOut.model_validate(user))


@router.post("/register/doctor", response_model=DoctorRequestOut, status_code=status.HTTP_201_CREATED)
def register_doctor(payload: DoctorRegisterIn, db: Session = Depends(get_db)):
    """طلب انضمام دكتور: بيتعمل بحالة pending ومينفعش يسجل دخول لحد ما الأدمن يوافق."""
    email = payload.email.lower()
    if db.scalar(select(User.id).where(User.email == email)):
        raise HTTPException(status_code=409, detail="Email is already registered")
    if db.get(Specialty, payload.specialty_id) is None:
        raise HTTPException(status_code=400, detail="Specialty does not exist")
    if payload.clinic_id and db.get(Clinic, payload.clinic_id) is None:
        raise HTTPException(status_code=400, detail="Clinic does not exist")
    license_no = payload.license_number.strip()
    taken = db.scalar(
        select(Doctor.id).where(
            func.lower(Doctor.license_number) == license_no.lower(),
            Doctor.status != DoctorStatus.rejected.value,
        )
    )
    if taken:
        raise HTTPException(status_code=409, detail="A doctor with this license number is already registered")

    user = User(
        email=email,
        hashed_password=hash_password(payload.password),
        first_name=payload.first_name.strip(),
        last_name=payload.last_name.strip(),
        full_name=f"{payload.first_name.strip()} {payload.last_name.strip()}",
        phone=payload.phone,
        role=Role.doctor.value,
    )
    db.add(user)
    try:
        db.flush()
        doctor = Doctor(
            user_id=user.id,
            specialty_id=payload.specialty_id,
            clinic_id=payload.clinic_id,
            bio=payload.bio,
            years_of_experience=payload.years_of_experience,
            consultation_fee=payload.consultation_fee,
            license_number=license_no,
            gender=payload.gender,
        )
        set_doctor_status(doctor, DoctorStatus.pending.value)
        db.add(doctor)
        db.flush()
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=409, detail="Email is already registered")

    notify_admins(db, "New doctor request", f"Dr. {user.full_name} asked to join Clinika.", "doctor_request")
    log_activity(db, user.id, "doctor_requested", "doctor", doctor.id, f"Doctor request from {user.full_name}")
    db.commit()
    return DoctorRequestOut(
        message="Your request was received. You will be able to sign in once an admin approves it.",
        status=doctor.status,
        doctor_id=doctor.id,
    )


@router.post("/login", response_model=TokenOut)
def login(payload: LoginIn, db: Session = Depends(get_db)):
    """Login بـ JSON (للـ React)."""
    user = _authenticate(db, payload.email, payload.password)
    return TokenOut(access_token=_token_for(user, payload.remember_me), user=UserOut.model_validate(user))


@router.post("/token", include_in_schema=True, summary="OAuth2 form login (for Swagger Authorize button)")
def token(form: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    user = _authenticate(db, form.username, form.password)
    return {"access_token": _token_for(user), "token_type": "bearer"}


@router.get("/me", response_model=UserOut)
def me(user: User = Depends(get_current_user)):
    return user


@router.put("/me", response_model=UserOut)
def update_me(payload: UserUpdate, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    data = payload.model_dump(exclude_unset=True, exclude={"full_name", "current_password"})

    new_email = data.pop("email", None)
    if new_email is not None and new_email.lower() != user.email:
        if not payload.current_password or not verify_password(payload.current_password, user.hashed_password):
            raise HTTPException(status_code=400, detail="Current password is required to change your email")
        new_email = new_email.lower()
        if db.scalar(select(User.id).where(User.email == new_email, User.id != user.id)):
            raise HTTPException(status_code=409, detail="Email is already registered")
        user.email = new_email

    if "avatar_url" in data:
        data["avatar_url"] = validate_image_url(data["avatar_url"])

    for field, value in data.items():
        setattr(user, field, value)
    user.refresh_full_name()
    db.add(user)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=409, detail="Email is already registered")
    return user


@router.post("/change-password", response_model=AccessTokenOut)
def change_password(payload: ChangePasswordIn, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """بيغيّر الباسورد ويقفل كل الجلسات التانية. بيرجّع توكن جديد للجلسة الحالية عشان متتفصلش."""
    if not verify_password(payload.current_password, user.hashed_password):
        raise HTTPException(status_code=400, detail="Current password is incorrect")
    user.hashed_password = hash_password(payload.new_password)
    user.token_version = (user.token_version or 0) + 1
    db.add(user)
    db.commit()
    return AccessTokenOut(access_token=_token_for(user))


# ---------- forgot / reset password ----------
@router.post("/forgot-password")
def forgot_password(payload: ForgotPasswordIn, db: Session = Depends(get_db)):
    """بيرجّع نفس الرد دايمًا (حتى لو الإيميل مش موجود) عشان محدش يعرف مين مسجل."""
    generic = {"message": "If this email is registered, a reset link has been sent."}
    user = db.scalar(select(User).where(User.email == payload.email.lower()))
    if user is None or not user.is_active:
        return generic

    # حماية بسيطة من الإرسال المتكرر: توكن واحد كل دقيقة
    recent = db.scalar(
        select(PasswordResetToken.id).where(
            PasswordResetToken.user_id == user.id,
            PasswordResetToken.created_at > datetime.now(timezone.utc) - timedelta(seconds=60),
        )
    )
    if recent:
        return generic

    minutes = settings.PASSWORD_RESET_EXPIRE_MINUTES
    raw = issue_reset_token(db, user, minutes)
    db.commit()
    send_password_reset_email(user.email, user.first_name, raw, minutes)
    return generic


def _valid_reset_token(db: Session, raw: str) -> PasswordResetToken | None:
    record = db.scalar(select(PasswordResetToken).where(PasswordResetToken.token_hash == hash_token(raw)))
    if record is None or record.used_at is not None:
        return None
    if aware(record.expires_at) < datetime.now(timezone.utc):
        return None
    return record


@router.get("/reset-password/validate")
def validate_reset_token(token: str = Query(..., min_length=20, max_length=200), db: Session = Depends(get_db)):
    """الفرونت ينادي عليه أول ما صفحة الريسيت تفتح عشان يعرض رسالة لو اللينك منتهي."""
    return {"valid": _valid_reset_token(db, token) is not None}


@router.post("/reset-password")
def reset_password(payload: ResetPasswordIn, db: Session = Depends(get_db)):
    record = _valid_reset_token(db, payload.token)
    if record is None:
        raise HTTPException(status_code=400, detail="This reset link is invalid or has expired")
    user = db.get(User, record.user_id)
    if user is None or not user.is_active:
        raise HTTPException(status_code=400, detail="This reset link is invalid or has expired")

    now = datetime.now(timezone.utc)
    user.hashed_password = hash_password(payload.new_password)
    user.token_version = (user.token_version or 0) + 1  # يقفل كل الجلسات المفتوحة
    record.used_at = now
    for other in db.scalars(
        select(PasswordResetToken).where(PasswordResetToken.user_id == user.id, PasswordResetToken.used_at.is_(None))
    ).all():
        other.used_at = now
    db.commit()
    return {"message": "Password updated. Please sign in with your new password."}
