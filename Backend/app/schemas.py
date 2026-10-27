from datetime import date, datetime, time
from typing import Literal

from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator, model_validator

from .services.names import split_full_name


class ORM(BaseModel):
    model_config = ConfigDict(from_attributes=True)


# ---------------- Names (Full Name أو first/last) ----------------
class NameMixin(BaseModel):
    """الفرونت ممكن يبعت full_name واحد أو first_name + last_name؛ الاتنين مقبولين."""

    full_name: str | None = Field(default=None, max_length=150)
    first_name: str | None = Field(default=None, min_length=1, max_length=70)
    last_name: str | None = Field(default=None, min_length=1, max_length=70)

    @model_validator(mode="before")
    @classmethod
    def _split_full_name(cls, data):
        if isinstance(data, dict) and data.get("full_name") and not data.get("first_name") and not data.get("last_name"):
            first, last = split_full_name(str(data["full_name"]))
            data = {**data, "first_name": first, "last_name": last}
        return data


class RequiredNameMixin(NameMixin):
    @model_validator(mode="after")
    def _names_required(self):
        if not self.first_name or not self.last_name:
            raise ValueError("first_name and last_name (or full_name) are required")
        return self


# ---------------- Auth / Users ----------------
class RegisterIn(RequiredNameMixin):
    email: EmailStr
    password: str = Field(min_length=8, max_length=72)
    phone: str | None = Field(default=None, max_length=30)
    date_of_birth: date | None = None
    gender: Literal["male", "female"] | None = None


class DoctorRegisterIn(RequiredNameMixin):
    """طلب انضمام دكتور (بيتراجع من الأدمن قبل ما الحساب يشتغل)."""

    email: EmailStr
    password: str = Field(min_length=8, max_length=72)
    phone: str | None = Field(default=None, max_length=30)
    gender: Literal["male", "female"] | None = None
    specialty_id: int
    clinic_id: int | None = None
    license_number: str = Field(min_length=3, max_length=60)
    years_of_experience: int = Field(default=0, ge=0, le=70)
    consultation_fee: float = Field(default=0, ge=0)
    bio: str | None = Field(default=None, max_length=2000)


class DoctorRequestOut(BaseModel):
    message: str
    status: str
    doctor_id: int


class LoginIn(BaseModel):
    email: EmailStr
    password: str
    remember_me: bool = False


class TokenOut(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: "UserOut"


class AccessTokenOut(BaseModel):
    access_token: str
    token_type: str = "bearer"


class UserOut(ORM):
    id: int
    email: EmailStr
    first_name: str
    last_name: str
    full_name: str
    phone: str | None
    role: str
    is_active: bool
    avatar_url: str | None = None
    created_at: datetime


class UserUpdate(NameMixin):
    phone: str | None = Field(default=None, max_length=30)
    avatar_url: str | None = Field(default=None, max_length=500)
    email: EmailStr | None = None
    current_password: str | None = Field(default=None, description="مطلوب لو بتغيّر الإيميل")


class ChangePasswordIn(BaseModel):
    current_password: str
    new_password: str = Field(min_length=8, max_length=72)


class ForgotPasswordIn(BaseModel):
    email: EmailStr


class ResetPasswordIn(BaseModel):
    token: str = Field(min_length=20, max_length=200)
    new_password: str = Field(min_length=8, max_length=72)


class AdminUserCreate(RequiredNameMixin):
    email: EmailStr
    password: str = Field(min_length=8, max_length=72)
    phone: str | None = None


class AdminPatientCreate(RequiredNameMixin):
    """الأدمن بيضيف مريض. لو مفيش password بنبعتله إيميل يختار هو كلمة السر."""

    email: EmailStr
    password: str | None = Field(default=None, min_length=8, max_length=72)
    phone: str | None = Field(default=None, max_length=30)
    date_of_birth: date | None = None
    gender: Literal["male", "female"] | None = None


class AdminUserStatusIn(BaseModel):
    is_active: bool


TokenOut.model_rebuild()


# ---------------- Specialties / Clinics ----------------
class SpecialtyIn(BaseModel):
    name: str = Field(min_length=2, max_length=120)
    description: str | None = None


class SpecialtyOut(ORM):
    id: int
    name: str
    description: str | None


class ClinicIn(BaseModel):
    name: str = Field(min_length=2, max_length=150)
    address: str | None = None
    city: str | None = None
    district: str | None = Field(default=None, max_length=100)
    phone: str | None = None
    email: EmailStr | None = None
    description: str | None = None
    latitude: float | None = Field(default=None, ge=-90, le=90)
    longitude: float | None = Field(default=None, ge=-180, le=180)
    photo_url: str | None = Field(default=None, max_length=500)
    parking_info: str | None = None


class ClinicUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=2, max_length=150)
    address: str | None = None
    city: str | None = None
    district: str | None = Field(default=None, max_length=100)
    phone: str | None = None
    email: EmailStr | None = None
    description: str | None = None
    latitude: float | None = Field(default=None, ge=-90, le=90)
    longitude: float | None = Field(default=None, ge=-180, le=180)
    photo_url: str | None = Field(default=None, max_length=500)
    parking_info: str | None = None
    is_active: bool | None = None


class ClinicOut(ORM):
    id: int
    name: str
    address: str | None
    city: str | None
    district: str | None = None
    phone: str | None
    email: str | None
    description: str | None
    latitude: float | None = None
    longitude: float | None = None
    photo_url: str | None = None
    parking_info: str | None = None
    is_active: bool


# ---------------- Patients ----------------
class PatientUpdate(NameMixin):
    phone: str | None = None
    date_of_birth: date | None = None
    gender: Literal["male", "female"] | None = None
    blood_type: Literal["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"] | None = None
    address: str | None = None
    emergency_contact_name: str | None = None
    emergency_contact_phone: str | None = None
    allergies: str | None = None
    chronic_conditions: str | None = None


class PatientBrief(ORM):
    id: int
    full_name: str
    phone: str | None
    avatar_url: str | None = None


class PatientOut(ORM):
    id: int
    user_id: int
    first_name: str
    last_name: str
    full_name: str
    phone: str | None
    avatar_url: str | None = None
    date_of_birth: date | None
    gender: str | None
    blood_type: str | None
    address: str | None
    emergency_contact_name: str | None
    emergency_contact_phone: str | None
    allergies: str | None
    chronic_conditions: str | None


# ---------------- Doctors ----------------
class CredentialIn(BaseModel):
    kind: Literal["education", "certification"] = "education"
    title: str = Field(min_length=2, max_length=200)
    institution: str | None = Field(default=None, max_length=200)
    year: int | None = Field(default=None, ge=1950, le=2100)


class CredentialOut(ORM, CredentialIn):
    id: int


class DoctorProfileFields(BaseModel):
    gender: Literal["male", "female"] | None = None
    title: str | None = Field(default=None, max_length=150)
    room: str | None = Field(default=None, max_length=60)
    languages: list[str] | None = None
    focus_areas: list[str] | None = None
    accepting_new_patients: bool | None = None
    offers_online: bool | None = None


class DoctorCreate(RequiredNameMixin):
    email: EmailStr
    password: str = Field(min_length=8, max_length=72)
    phone: str | None = None
    specialty_id: int
    clinic_id: int | None = None
    bio: str | None = None
    years_of_experience: int = Field(default=0, ge=0, le=70)
    consultation_fee: float = Field(default=0, ge=0)
    license_number: str | None = None
    slot_duration_minutes: int = Field(default=30, ge=10, le=120)
    gender: Literal["male", "female"] | None = None
    title: str | None = Field(default=None, max_length=150)
    room: str | None = Field(default=None, max_length=60)
    languages: list[str] | None = None
    focus_areas: list[str] | None = None
    is_verified: bool = False
    accepting_new_patients: bool = True
    offers_online: bool = False


class DoctorUpdate(DoctorProfileFields):
    specialty_id: int | None = None
    clinic_id: int | None = None
    bio: str | None = None
    years_of_experience: int | None = Field(default=None, ge=0, le=70)
    consultation_fee: float | None = Field(default=None, ge=0)
    license_number: str | None = None
    slot_duration_minutes: int | None = Field(default=None, ge=10, le=120)
    is_active: bool | None = None
    is_verified: bool | None = None
    photo_url: str | None = Field(default=None, max_length=500)


class DoctorReviewIn(BaseModel):
    action: Literal["approve", "reject"]
    reason: str | None = Field(default=None, max_length=500)


class DoctorVerifyIn(BaseModel):
    is_verified: bool


class NextSlot(BaseModel):
    appointment_date: date
    start_time: time
    clinic_id: int | None = None


class DoctorBrief(ORM):
    id: int
    full_name: str
    specialty_name: str | None
    clinic_name: str | None
    photo_url: str | None = None
    title: str | None = None
    room: str | None = None
    consultation_fee: float = 0
    clinic: ClinicOut | None = None
    rating_avg: float | None = None
    reviews_count: int = 0


class DoctorOut(ORM):
    id: int
    user_id: int
    first_name: str
    last_name: str
    full_name: str
    email: str
    phone: str | None
    photo_url: str | None = None
    gender: str | None = None
    title: str | None = None
    room: str | None = None
    specialty: SpecialtyOut | None
    clinic: ClinicOut | None
    clinics: list[ClinicOut] = []  # كل العيادات اللي الدكتور بيشتغل فيها (من جدوله)
    bio: str | None
    years_of_experience: int
    consultation_fee: float
    license_number: str | None
    slot_duration_minutes: int
    is_active: bool
    status: str = "active"
    rejection_reason: str | None = None
    is_verified: bool = False
    accepting_new_patients: bool = True
    offers_online: bool = False
    languages: list[str] = []
    focus_areas: list[str] = []
    credentials: list[CredentialOut] = []
    rating_avg: float | None = None
    reviews_count: int = 0
    next_available: NextSlot | None = None

    @field_validator("languages", "focus_areas", mode="before")
    @classmethod
    def _none_to_list(cls, v):
        return v or []


class ScheduleItem(BaseModel):
    day_of_week: int = Field(ge=0, le=6, description="0=Monday ... 6=Sunday")
    start_time: time
    end_time: time
    is_active: bool = True
    clinic_id: int | None = Field(default=None, description="العيادة في الفترة دي (فاضي = عيادته الأساسية)")

    @model_validator(mode="after")
    def check_times(self):
        if self.end_time <= self.start_time:
            raise ValueError("end_time must be after start_time")
        return self


class ScheduleOut(ORM):
    id: int
    day_of_week: int
    start_time: time
    end_time: time
    is_active: bool
    clinic_id: int | None = None
    clinic_name: str | None = None


class TimeOffIn(BaseModel):
    start_date: date
    end_date: date
    reason: str | None = Field(default=None, max_length=255)

    @model_validator(mode="after")
    def check_dates(self):
        if self.end_date < self.start_date:
            raise ValueError("end_date must be on or after start_date")
        return self


class TimeOffOut(ORM):
    id: int
    start_date: date
    end_date: date
    reason: str | None


class SlotOut(BaseModel):
    start_time: time
    end_time: time
    is_available: bool
    clinic_id: int | None = None


# ---------------- Appointments ----------------
class AppointmentCreate(BaseModel):
    doctor_id: int
    appointment_date: date
    start_time: time
    reason: str | None = Field(default=None, max_length=1000)
    consultation_type: Literal["in_person", "online"] = "in_person"
    clinic_id: int | None = Field(default=None, description="العيادة المختارة (اختياري؛ بيتأكد إن الدكتور فيها في الوقت ده)")


class AdminAppointmentCreate(AppointmentCreate):
    """الأدمن بيحجز نيابة عن مريض."""

    patient_id: int
    status: Literal["pending", "confirmed"] = "confirmed"


class MeetingLinkIn(BaseModel):
    meeting_link: str | None = Field(default=None, max_length=500)

    @field_validator("meeting_link")
    @classmethod
    def _https_only(cls, v):
        if v and not v.startswith("https://"):
            raise ValueError("meeting_link must start with https://")
        return v


class RescheduleIn(BaseModel):
    appointment_date: date
    start_time: time
    clinic_id: int | None = None


class CancelIn(BaseModel):
    reason: str | None = Field(default=None, max_length=500)


class StatusUpdateIn(BaseModel):
    status: Literal["confirmed", "completed", "no_show"]


class AppointmentOut(ORM):
    id: int
    patient: PatientBrief
    doctor: DoctorBrief
    appointment_date: date
    start_time: time
    end_time: time
    status: str
    reason: str | None
    cancellation_reason: str | None
    cancelled_by: str | None
    clinic_id: int | None = None
    clinic: ClinicOut | None = None
    consultation_type: str = "in_person"
    reference_number: str | None = None
    fee_at_booking: float | None = None
    meeting_link: str | None = None
    has_review: bool = False
    created_at: datetime


# ---------------- Medical records ----------------
class MedicalRecordCreate(BaseModel):
    patient_id: int
    appointment_id: int | None = None
    symptoms: str | None = None
    diagnosis: str = Field(min_length=2)
    treatment_plan: str | None = None
    notes: str | None = None
    follow_up_date: date | None = None


class MedicalRecordUpdate(BaseModel):
    symptoms: str | None = None
    diagnosis: str | None = Field(default=None, min_length=2)
    treatment_plan: str | None = None
    notes: str | None = None
    follow_up_date: date | None = None


class MedicalRecordOut(ORM):
    id: int
    patient: PatientBrief
    doctor: DoctorBrief
    appointment_id: int | None
    symptoms: str | None
    diagnosis: str
    treatment_plan: str | None
    notes: str | None
    follow_up_date: date | None
    created_at: datetime
    updated_at: datetime


# ---------------- Prescriptions ----------------
class PrescriptionItemIn(BaseModel):
    medication_name: str = Field(min_length=1, max_length=200)
    dosage: str | None = None
    frequency: str | None = None
    duration: str | None = None
    instructions: str | None = None


class PrescriptionItemOut(ORM, PrescriptionItemIn):
    id: int


class PrescriptionCreate(BaseModel):
    patient_id: int
    appointment_id: int | None = None
    medical_record_id: int | None = None
    notes: str | None = None
    items: list[PrescriptionItemIn] = Field(min_length=1)


class PrescriptionOut(ORM):
    id: int
    patient: PatientBrief
    doctor: DoctorBrief
    appointment_id: int | None
    medical_record_id: int | None
    notes: str | None
    items: list[PrescriptionItemOut]
    created_at: datetime


# ---------------- Notifications / Reviews ----------------
class NotificationOut(ORM):
    id: int
    title: str
    message: str
    type: str
    is_read: bool
    created_at: datetime


class ReviewCreate(BaseModel):
    appointment_id: int
    rating: int = Field(ge=1, le=5)
    comment: str | None = Field(default=None, max_length=1000)


class ReviewOut(ORM):
    id: int
    patient: PatientBrief
    doctor_id: int
    appointment_id: int
    rating: int
    comment: str | None
    created_at: datetime


class AuditLogOut(ORM):
    id: int
    user_id: int | None
    action: str
    entity_type: str
    entity_id: int | None
    created_at: datetime


# ---------------- Contact / Activity / Public ----------------
class ContactIn(BaseModel):
    name: str = Field(min_length=2, max_length=120)
    email: EmailStr
    subject: str | None = Field(default=None, max_length=200)
    message: str = Field(min_length=5, max_length=3000)


class ContactOut(ORM):
    id: int
    name: str
    email: str
    subject: str | None
    message: str
    status: str
    created_at: datetime


class ContactStatusIn(BaseModel):
    status: Literal["new", "read", "resolved"]


class ActivityOut(ORM):
    id: int
    actor_user_id: int | None
    actor_name: str | None = None
    action: str
    entity_type: str
    entity_id: int | None
    description: str
    created_at: datetime
