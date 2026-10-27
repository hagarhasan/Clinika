"""doctor chooses clinic per schedule block; appointments remember their clinic

Revision ID: b2d4e6f8a0c1
Revises: a1f3c9d2b7e4
Create Date: 2026-10-27 20:00:00

دفاعية زي اللي قبلها: بتتخطى أي عمود أو index موجود.
  * doctor_schedules.clinic_id : العيادة في الفترة دي (NULL = عيادة الدكتور الأساسية، فالجداول القديمة بتفضل زي ما هي)
  * appointments.clinic_id     : العيادة اللي اتحجز فيها الموعد (الحجوزات القديمة بتاخد عيادة الدكتور الأساسية)
"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "b2d4e6f8a0c1"
down_revision: Union[str, None] = "a1f3c9d2b7e4"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def _inspector():
    return sa.inspect(op.get_bind())


def _has_column(table: str, column: str) -> bool:
    return any(c["name"] == column for c in _inspector().get_columns(table))


def _has_index(table: str, index: str) -> bool:
    return any(i["name"] == index for i in _inspector().get_indexes(table))


def _add_clinic_fk_column(table: str) -> None:
    if not _has_column(table, "clinic_id"):
        with op.batch_alter_table(table) as batch:
            batch.add_column(
                sa.Column("clinic_id", sa.Integer(), sa.ForeignKey("clinics.id", ondelete="SET NULL"), nullable=True)
            )
    index = f"ix_{table}_clinic_id"
    if not _has_index(table, index):
        op.create_index(index, table, ["clinic_id"])


def upgrade() -> None:
    _add_clinic_fk_column("doctor_schedules")

    had_appt_clinic = _has_column("appointments", "clinic_id")
    _add_clinic_fk_column("appointments")
    if not had_appt_clinic:
        op.get_bind().execute(
            sa.text(
                "UPDATE appointments SET clinic_id = "
                "(SELECT clinic_id FROM doctors WHERE doctors.id = appointments.doctor_id) "
                "WHERE clinic_id IS NULL"
            )
        )


def downgrade() -> None:
    for table in ("appointments", "doctor_schedules"):
        index = f"ix_{table}_clinic_id"
        if _has_index(table, index):
            op.drop_index(index, table_name=table)
        if _has_column(table, "clinic_id"):
            with op.batch_alter_table(table) as batch:
                batch.drop_column("clinic_id")
