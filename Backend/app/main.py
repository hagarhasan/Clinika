import warnings

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from .config import settings
from .database import Base, engine
from .routers import (
    admin,
    appointments,
    auth,
    clinics,
    doctors,
    internal,
    medical_records,
    notifications,
    patients,
    prescriptions,
    public,
    reviews,
    specialties,
    uploads,
)

if settings.AUTO_CREATE_TABLES:
    from . import models  # noqa: F401

    Base.metadata.create_all(bind=engine)

if settings.SECRET_KEY == "dev-secret-change-me" or settings.ADMIN_PASSWORD == "Admin@12345":
    warnings.warn(
        "SECRET_KEY / ADMIN_PASSWORD are still the default values. Set real ones in the environment variables.",
        stacklevel=1,
    )

app = FastAPI(
    title=settings.APP_NAME,
    version="1.0.0",
    description="Clinika — Clinic Management & Booking Platform API",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["X-Total-Count"],  # عشان الفرونت يقرا العدد الكلي للـ pagination
)

for r in (
    auth.router,
    specialties.router,
    clinics.router,
    doctors.router,
    patients.router,
    appointments.router,
    medical_records.router,
    prescriptions.router,
    notifications.router,
    reviews.router,
    admin.router,
    public.router,
    uploads.router,
    internal.router,
):
    app.include_router(r)


@app.get("/", tags=["Health"])
def root():
    return {"name": settings.APP_NAME, "status": "running", "docs": "/docs"}


@app.get("/health", tags=["Health"])
def health():
    return {"status": "ok"}


@app.exception_handler(Exception)
def unhandled_exception_handler(request, exc):  # noqa: ARG001
    return JSONResponse(status_code=500, content={"detail": "Internal server error"})
