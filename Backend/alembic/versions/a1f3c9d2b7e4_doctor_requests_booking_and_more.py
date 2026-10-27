"""doctor requests, password reset, booking details, contact, activity

Revision ID: a1f3c9d2b7e4
Revises: 74a942950602
Create Date: 2026-10-27 12:00:00

الـ migration دي "دفاعية": بتضيف الأعمدة والجداول الناقصة بس، وبتتخطى أي حاجة موجودة.
ده مهم لأن:
  * الـ initial migration مفيهاش users.first_name / last_name رغم إن الـ models بتستخدمهم،
    فالداتابيز الشغالة على Neon اتعملت على الأغلب بـ create_all.
  * كده تشتغل بأمان سواء الداتابيز قديمة (Neon الحالية) أو جديدة من الصفر (alembic upgrade head).
"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "a1f3c9d2b7e4"
down_revision: Union[str, None] = "74a942950602"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


# ---------- helpers ----------
def _inspector():
    return sa.inspect(op.get_bind())


def _has_table(name: str) -> bool:
    return name in _inspector().get_table_names()


def _has_column(table: str, column: str) -> bool:
    return any(c["name"] == column for c in _inspector().get_columns(table))


def _has_index(table: str, index: str) -> bool:
    return any(i["name"] == index for i in _inspector().get_indexes(table))


def _add_column(table: str, column: sa.Column) -> None:
    if not _has_column(table, column.name):
        with op.batch_alter_table(table) as batch:
            batch.add_column(column)


def _create_index(name: str, table: str, columns: list[str], unique: bool = False) -> None:
    if not _has_index(table, name):
        op.create_index(name, table, columns, unique=unique)


def upgrade() -> None:
    bind = op.get_bind()

    # ---------------- users ----------------
    # (لو الداتابيز اتعملت من الـ initial migration القديمة، first/last name مش موجودين)
    had_names = _has_column("users", "first_name") and _has_column("users", "last_name")
    _add_column("users", sa.Column("first_name", sa.String(75), nullable=False, server_default=""))
    _add_column("users", sa.Column("last_name", sa.String(75), nullable=False, server_default=""))
    if not had_names:
        users = sa.table("users", sa.column("id", sa.Integer), sa.column("full_name", sa.String),
                         sa.column("first_name", sa.String), sa.column("last_name", sa.String))
        for uid, full in bind.execute(sa.select(users.c.id, users.c.full_name)).all():
            parts = (full or "").split()
            first = parts[0] if parts else ""
            last = " ".join(parts[1:]) if len(parts) > 1 else ""
            bind.execute(users.update().where(users.c.id == uid).values(first_name=first[:75], last_name=last[:75]))
    _add_column("users", sa.Column("avatar_url", sa.String(500), nullable=True))
    _add_column("users", sa.Column("token_version", sa.Integer(), nullable=False, server_default="0"))

    # ---------------- clinics ----------------
    _add_column("clinics", sa.Column("district", sa.String(100), nullable=True))
    _add_column("clinics", sa.Column("latitude", sa.Float(), nullable=True))
    _add_column("clinics", sa.Column("longitude", sa.Float(), nullable=True))
    _add_column("clinics", sa.Column("photo_url", sa.String(500), nullable=True))
    _add_column("clinics", sa.Column("parking_info", sa.Text(), nullable=True))
    _create_index("ix_clinics_district", "clinics", ["district"])

    # ---------------- doctors ----------------
    had_status = _has_column("doctors", "status")
    _add_column("doctors", sa.Column("status", sa.String(20), nullable=False, server_default="active"))
    if not had_status:
        # الدكاترة الموجودين: active لو is_active، غير كده inactive
        bind.execute(sa.text("UPDATE doctors SET status = 'inactive' WHERE is_active = :f").bindparams(f=False))
    _add_column("doctors", sa.Column("rejection_reason", sa.Text(), nullable=True))
    _add_column("doctors", sa.Column("reviewed_at", sa.DateTime(timezone=True), nullable=True))
    _add_column("doctors", sa.Column("gender", sa.String(10), nullable=True))
    _add_column("doctors", sa.Column("title", sa.String(150), nullable=True))
    _add_column("doctors", sa.Column("room", sa.String(60), nullable=True))
    _add_column("doctors", sa.Column("languages", sa.JSON(), nullable=True))
    _add_column("doctors", sa.Column("focus_areas", sa.JSON(), nullable=True))
    _add_column("doctors", sa.Column("is_verified", sa.Boolean(), nullable=False, server_default=sa.false()))
    _add_column("doctors", sa.Column("accepting_new_patients", sa.Boolean(), nullable=False, server_default=sa.true()))
    _add_column("doctors", sa.Column("offers_online", sa.Boolean(), nullable=False, server_default=sa.false()))
    _create_index("ix_doctors_status", "doctors", ["status"])

    # ---------------- appointments ----------------
    had_ref = _has_column("appointments", "reference_number")
    _add_column("appointments", sa.Column("consultation_type", sa.String(20), nullable=False, server_default="in_person"))
    _add_column("appointments", sa.Column("reference_number", sa.String(30), nullable=True))
    _add_column("appointments", sa.Column("fee_at_booking", sa.Numeric(10, 2), nullable=True))
    _add_column("appointments", sa.Column("meeting_link", sa.String(500), nullable=True))
    if not had_ref:
        # الحجوزات القديمة: نفس الرقم المرجعي (APT-<سنة الإنشاء>-<id>) وسعر الكشف الحالي للدكتور
        appts = sa.table("appointments", sa.column("id", sa.Integer), sa.column("created_at", sa.DateTime(timezone=True)),
                         sa.column("reference_number", sa.String))
        for aid, created in bind.execute(sa.select(appts.c.id, appts.c.created_at)).all():
            year = created.year if created is not None else 2026
            bind.execute(appts.update().where(appts.c.id == aid).values(reference_number=f"APT-{year}-{aid:04d}"))
        bind.execute(sa.text(
            "UPDATE appointments SET fee_at_booking = "
            "(SELECT consultation_fee FROM doctors WHERE doctors.id = appointments.doctor_id) "
            "WHERE fee_at_booking IS NULL"
        ))
    _create_index("ix_appointments_reference_number", "appointments", ["reference_number"], unique=True)

    # ---------------- new tables ----------------
    if not _has_table("doctor_credentials"):
        op.create_table(
            "doctor_credentials",
            sa.Column("id", sa.Integer(), primary_key=True),
            sa.Column("doctor_id", sa.Integer(), sa.ForeignKey("doctors.id", ondelete="CASCADE"), nullable=False),
            sa.Column("kind", sa.String(20), nullable=False),
            sa.Column("title", sa.String(200), nullable=False),
            sa.Column("institution", sa.String(200), nullable=True),
            sa.Column("year", sa.Integer(), nullable=True),
        )
        op.create_index("ix_doctor_credentials_doctor_id", "doctor_credentials", ["doctor_id"])

    if not _has_table("password_reset_tokens"):
        op.create_table(
            "password_reset_tokens",
            sa.Column("id", sa.Integer(), primary_key=True),
            sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
            sa.Column("token_hash", sa.String(64), nullable=False),
            sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
            sa.Column("used_at", sa.DateTime(timezone=True), nullable=True),
            sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        )
        op.create_index("ix_password_reset_tokens_user_id", "password_reset_tokens", ["user_id"])
        op.create_index("ix_password_reset_tokens_token_hash", "password_reset_tokens", ["token_hash"], unique=True)

    if not _has_table("contact_messages"):
        op.create_table(
            "contact_messages",
            sa.Column("id", sa.Integer(), primary_key=True),
            sa.Column("name", sa.String(120), nullable=False),
            sa.Column("email", sa.String(255), nullable=False),
            sa.Column("subject", sa.String(200), nullable=True),
            sa.Column("message", sa.Text(), nullable=False),
            sa.Column("status", sa.String(20), nullable=False, server_default="new"),
            sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        )
        op.create_index("ix_contact_messages_email", "contact_messages", ["email"])
        op.create_index("ix_contact_messages_status", "contact_messages", ["status"])
        op.create_index("ix_contact_messages_created_at", "contact_messages", ["created_at"])

    if not _has_table("activity_logs"):
        op.create_table(
            "activity_logs",
            sa.Column("id", sa.Integer(), primary_key=True),
            sa.Column("actor_user_id", sa.Integer(), sa.ForeignKey("users.id", ondelete="SET NULL"), nullable=True),
            sa.Column("action", sa.String(60), nullable=False),
            sa.Column("entity_type", sa.String(60), nullable=False),
            sa.Column("entity_id", sa.Integer(), nullable=True),
            sa.Column("description", sa.String(255), nullable=False),
            sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        )
        op.create_index("ix_activity_logs_actor_user_id", "activity_logs", ["actor_user_id"])
        op.create_index("ix_activity_logs_created_at", "activity_logs", ["created_at"])


def downgrade() -> None:
    for table in ("activity_logs", "contact_messages", "password_reset_tokens", "doctor_credentials"):
        if _has_table(table):
            op.drop_table(table)

    if _has_index("appointments", "ix_appointments_reference_number"):
        op.drop_index("ix_appointments_reference_number", table_name="appointments")
    for col in ("meeting_link", "fee_at_booking", "reference_number", "consultation_type"):
        if _has_column("appointments", col):
            with op.batch_alter_table("appointments") as batch:
                batch.drop_column(col)

    if _has_index("doctors", "ix_doctors_status"):
        op.drop_index("ix_doctors_status", table_name="doctors")
    for col in ("offers_online", "accepting_new_patients", "is_verified", "focus_areas", "languages", "room",
                "title", "gender", "reviewed_at", "rejection_reason", "status"):
        if _has_column("doctors", col):
            with op.batch_alter_table("doctors") as batch:
                batch.drop_column(col)

    if _has_index("clinics", "ix_clinics_district"):
        op.drop_index("ix_clinics_district", table_name="clinics")
    for col in ("parking_info", "photo_url", "longitude", "latitude", "district"):
        if _has_column("clinics", col):
            with op.batch_alter_table("clinics") as batch:
                batch.drop_column(col)

    for col in ("token_version", "avatar_url"):
        if _has_column("users", col):
            with op.batch_alter_table("users") as batch:
                batch.drop_column(col)
    # first_name / last_name بنسيبهم: الـ models محتاجاهم
