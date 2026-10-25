"""بيانات تجريبية:  python -m app.seed
(يفضل بيانات تجريبية فقط في النسخة الأولى، زي ما في الـ documentation)"""
from datetime import time

from sqlalchemy import select

from . import models  # noqa: F401
from .config import settings
from .database import Base, SessionLocal, engine
from .models import Clinic, Doctor, DoctorSchedule, Patient, Role, Specialty, User
from .security import hash_password

SPECIALTIES = [
    ("Cardiology", "Heart and blood vessels"),
    ("Dermatology", "Skin, hair and nails"),
    ("Pediatrics", "Children's health"),
    ("Orthopedics", "Bones and joints"),
    ("Dentistry", "Teeth and oral health"),
    ("General Practice", "Primary care"),
]

DOCTORS = [
    ("dr.ahmed@clinika.com", "Ahmed", "Hassan", "Cardiology", 12, 400),
    ("dr.sara@clinika.com", "Sara", "Mahmoud", "Dermatology", 8, 300),
    ("dr.omar@clinika.com", "Omar", "Khaled", "Pediatrics", 10, 250),
]

DEMO_PASSWORD = "Doctor@12345"
PATIENT_PASSWORD = "Patient@12345"


def get_or_create_user(db, email, password, first_name, last_name, role, phone=None) -> tuple[User, bool]:
    user = db.scalar(select(User).where(User.email == email))
    if user:
        return user, False
    user = User(
        email=email, hashed_password=hash_password(password), first_name=first_name, last_name=last_name,
        full_name=f"{first_name} {last_name}", role=role, phone=phone,
    )
    db.add(user)
    db.flush()
    return user, True


def run() -> None:
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        get_or_create_user(db, settings.ADMIN_EMAIL, settings.ADMIN_PASSWORD, "Clinika", "Admin", Role.admin.value)

        specs = {}
        for name, desc in SPECIALTIES:
            spec = db.scalar(select(Specialty).where(Specialty.name == name))
            if not spec:
                spec = Specialty(name=name, description=desc)
                db.add(spec)
                db.flush()
            specs[name] = spec

        clinic = db.scalar(select(Clinic).where(Clinic.name == "Clinika Main Clinic"))
        if not clinic:
            clinic = Clinic(
                name="Clinika Main Clinic", address="Main Street", city="Qena", phone="0965000000",
                email="info@clinika.com", description="Demo clinic",
            )
            db.add(clinic)
            db.flush()

        for email, first, last, spec_name, years, fee in DOCTORS:
            user, created = get_or_create_user(db, email, DEMO_PASSWORD, first, last, Role.doctor.value, "01000000000")
            if created:
                doctor = Doctor(
                    user_id=user.id, specialty_id=specs[spec_name].id, clinic_id=clinic.id,
                    bio=f"{spec_name} specialist with {years} years of experience.",
                    years_of_experience=years, consultation_fee=fee, slot_duration_minutes=30,
                )
                db.add(doctor)
                db.flush()
                # السبت(5) الأحد(6) الاثنين(0) الثلاثاء(1) الأربعاء(2)
                for day in (5, 6, 0, 1, 2):
                    db.add(DoctorSchedule(doctor_id=doctor.id, day_of_week=day, start_time=time(10, 0), end_time=time(14, 0)))
                    db.add(DoctorSchedule(doctor_id=doctor.id, day_of_week=day, start_time=time(17, 0), end_time=time(21, 0)))

        for email, first, last, gender in (
            ("patient1@clinika.com", "Mona", "Ali", "female"),
            ("patient2@clinika.com", "Youssef", "Adel", "male"),
        ):
            user, created = get_or_create_user(db, email, PATIENT_PASSWORD, first, last, Role.patient.value, "01111111111")
            if created:
                db.add(Patient(user_id=user.id, gender=gender))

        db.commit()
        print("Seed completed.")
        print(f"Admin   : {settings.ADMIN_EMAIL} / {settings.ADMIN_PASSWORD}")
        print(f"Doctors : dr.ahmed@clinika.com (and others) / {DEMO_PASSWORD}")
        print(f"Patients: patient1@clinika.com / {PATIENT_PASSWORD}")
    finally:
        db.close()


if __name__ == "__main__":
    run()
