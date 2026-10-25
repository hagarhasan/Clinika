"""إنشاء الجداول للتجربة السريعة فقط:  python -m app.init_db
للمشروع الفعلي استخدمي Alembic:  alembic upgrade head
"""
from . import models  # noqa: F401
from .database import Base, engine

if __name__ == "__main__":
    Base.metadata.create_all(bind=engine)
    print("Tables created successfully.")
