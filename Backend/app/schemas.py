from datetime import date, datetime, time
from typing import Literal

from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator, model_validator


class ORM(BaseModel):
    model_config = ConfigDict(from_attributes=True)


# ---------------- Auth / Users ----------------
class RegisterIn(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8, max_length=72)
    first_name: str = Field(min_length=1, max_length=70)
    last_name: str = Field(min_length=1, max_length=70)
    phone: str | None = Field(default=None, max_length=30)
    date_of_birth: date | None = None
    gender: Literal["male", "female"] | None = None


class LoginIn(BaseModel):
    email: EmailStr
    password: str


class TokenOut(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: "UserOut"


class UserOut(ORM):
    id: int
    email: EmailStr
    first_name: str
    last_name: str
    full_name: str
    phone: str | None
    role: str
    is_active: bool
    created_at: datetime


class UserUpdate(BaseModel):
    first_name: str | None = Field(default=None, min_length=1, max_length=70)
    last_name: str | None = Field(default=None, min_length=1, max_length=70)
    phone: str | None = Field(default=None, max_length=30)


class ChangePasswordIn(BaseModel):
    current_password: str
    new_password: str = Field(min_length=8, max_length=72)


class AdminUserCreate(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8, max_length=72)
    first_name: str = Field(min_length=1, max_length=70)
    last_name: str = Field(min_length=1, max_length=70)
    phone: str | None = None


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
    phone: str | None = None
    email: EmailStr | None = None
    description: str | None = None


class ClinicUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=2, max_length=150)
    address: str | None = None
    city: str | None = None
    phone: str | None = None
    email: EmailStr | None = None
    description: str | None = None
    is_active: bool | None = None


class ClinicOut(ORM):
    id: int
    name: str
    address: str | None
    city: str | None
    phone: str | None
    email: str | None
    description: str | None
    is_active: bool


# ---------------- Patients ----------------
class PatientUpdate(BaseModel):
    first_name: str | None = Field(default=None, min_length=1, max_length=70)
    last_name: str | None = Field(default=None, min_length=1, max_length=70)
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


class PatientOut(ORM):
    id: int
    user_id: int
    first_name: str
    last_name: str
    full_name: str
    phone: str | None
    date_of_birth: date | None
    gender: str | None
    blood_type: str | None
    address: str | None
    emergency_contact_name: str | None
    emergency_contact_phone: str | None
    allergies: str | None
    chronic_conditions: str | None


# ---------------- Doctors ----------------
class DoctorCreate(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8, max_length=72)
    first_name: str = Field(min_length=1, max_length=70)
    last_name: str = Field(min_length=1, max_length=70)
    phone: str | None = None
    specialty_id: int
    clinic_id: int | None = None
    bio: str | None = None
    years_of_experience: int = Field(default=0, ge=0, le=70)
    consultation_fee: float = Field(default=0, ge=0)
    license_number: str | None = None
    slot_duration_minutes: int = Field(default=30, ge=10, le=120)


class DoctorUpdate(BaseModel):
    specialty_id: int | None = None
    clinic_id: int | None = None
    bio: str | None = None
    years_of_experience: int | None = Field(default=None, ge=0, le=70)
    consultation_fee: float | None = Field(default=None, ge=0)
    license_number: str | None = None
    slot_duration_minutes: int | None = Field(default=None, ge=10, le=120)
    is_active: bool | None = None


class DoctorBrief(ORM):
    id: int
    full_name: str
    specialty_name: str | None
    clinic_name: str | None


class DoctorOut(ORM):
    id: int
    user_id: int
    first_name: str
    last_name: str
    full_name: str
    email: str
    phone: str | None
    specialty: SpecialtyOut | None
    clinic: ClinicOut | None
    bio: str | None
    years_of_experience: int
    consultation_fee: float
    license_number: str | None
    slot_duration_minutes: int
    is_active: bool
    rating_avg: float | None = None
    reviews_count: int = 0


class ScheduleItem(BaseModel):
    day_of_week: int = Field(ge=0, le=6, description="0=Monday ... 6=Sunday")
    start_time: time
    end_time: time
    is_active: bool = True

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


# ---------------- Appointments ----------------
class AppointmentCreate(BaseModel):
    doctor_id: int
    appointment_date: date
    start_time: time
    reason: str | None = Field(default=None, max_length=1000)


class RescheduleIn(BaseModel):
    appointment_date: date
    start_time: time


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
