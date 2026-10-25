import os

from sqlalchemy import create_engine
from sqlalchemy.orm import DeclarativeBase, sessionmaker
from sqlalchemy.pool import NullPool

from .config import settings


def _normalize_url(url: str) -> str:
    # Neon / Heroku style urls -> SQLAlchemy driver url
    if url.startswith("postgres://"):
        return url.replace("postgres://", "postgresql+psycopg2://", 1)
    if url.startswith("postgresql://"):
        return url.replace("postgresql://", "postgresql+psycopg2://", 1)
    return url


DATABASE_URL = _normalize_url(settings.DATABASE_URL)

_engine_kwargs: dict = {}
if DATABASE_URL.startswith("sqlite"):
    _engine_kwargs["connect_args"] = {"check_same_thread": False}
elif os.getenv("VERCEL"):
    # Serverless: لا نحتفظ بـ connections مفتوحة، Neon pooler بيتولى الموضوع
    _engine_kwargs["poolclass"] = NullPool
else:
    _engine_kwargs.update(pool_pre_ping=True, pool_size=5, max_overflow=5)

engine = create_engine(DATABASE_URL, **_engine_kwargs)
SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False, expire_on_commit=False)


class Base(DeclarativeBase):
    pass


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
