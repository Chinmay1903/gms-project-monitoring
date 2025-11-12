"""edited foregn keys made strict and add foregn key in task_monitor

Revision ID: 9828dcb93dee
Revises: 18639a434352
Create Date: 2025-11-11 12:26:35.960430

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy import text


# revision identifiers, used by Alembic.
revision: str = '9828dcb93dee'
down_revision: Union[str, Sequence[str], None] = '18639a434352'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

def upgrade() -> None:
    """Upgrade schema."""
    # 1) employees.role: SET NULL -> RESTRICT
    op.drop_constraint("fk_employees_role", "employees", type_="foreignkey")  # <-- rename if different
    op.create_foreign_key(
        "fk_employees_role_restrict",
        source_table="employees",
        referent_table="roles",
        local_cols=["role"],
        remote_cols=["role_id"],
        ondelete="RESTRICT",
    )

    # 2) project_staffing FKs: CASCADE -> RESTRICT
    op.drop_constraint("fk_project_staffing_project", "project_staffing", type_="foreignkey")  # rename if different
    op.drop_constraint("fk_project_staffing_employee", "project_staffing", type_="foreignkey") # rename if different

    op.create_foreign_key(
        "fk_project_staffing_project_restrict",
        source_table="project_staffing",
        referent_table="projects",
        local_cols=["project_id"],
        remote_cols=["project_id"],
        ondelete="RESTRICT",
    )
    op.create_foreign_key(
        "fk_project_staffing_employee_restrict",
        source_table="project_staffing",
        referent_table="employees",
        local_cols=["employees_id"],
        remote_cols=["employees_id"],
        ondelete="RESTRICT",
    )

    # 3) task_monitors: move to project_staffing_id
    # 3a) add new column + FK (nullable for backfill)
    op.add_column("task_monitors", sa.Column("project_staffing_id", sa.BigInteger(), nullable=True))
    op.create_foreign_key(
        "fk_task_monitors_project_staffing_restrict",
        source_table="task_monitors",
        referent_table="project_staffing",
        local_cols=["project_staffing_id"],
        remote_cols=["id"],
        ondelete="RESTRICT",
    )

    # 3b) backfill project_staffing_id from old (project_id, employees_id)
    op.execute("""
        UPDATE task_monitors tm
        SET project_staffing_id = ps.id
        FROM project_staffing ps
        WHERE ps.project_id = tm.project_id
          AND ps.employees_id = tm.employees_id
    """)

    # 3c) make NOT NULL after data is populated
    op.alter_column("task_monitors", "project_staffing_id", nullable=False)

    # 3d) drop old FKs + columns
    op.drop_constraint("fk_task_monitors_employees", "task_monitors", type_="foreignkey")  # rename if different
    op.drop_constraint("fk_task_monitors_projects", "task_monitors", type_="foreignkey")   # rename if different

    with op.batch_alter_table("task_monitors") as batch:
        batch.drop_column("employees_id")
        batch.drop_column("project_id")

    # (optional) helpful index
    op.create_index(
        "ix_task_monitors_psid_date",
        "task_monitors",
        ["project_staffing_id", "task_date"],
        unique=False,
    )
    # ### end Alembic commands ###


def downgrade() -> None:
    """Downgrade schema."""
    # Undo index + new FK/column
    op.drop_index("ix_task_monitors_psid_date", table_name="task_monitors")

    # Recreate old columns (nullable first)
    with op.batch_alter_table("task_monitors") as batch:
        batch.add_column(sa.Column("employees_id", sa.String(36), nullable=True))
        batch.add_column(sa.Column("project_id", sa.Integer(), nullable=True))

    # Backfill old columns from project_staffing_id
    op.execute("""
        UPDATE task_monitors tm
        SET employees_id = ps.employees_id,
            project_id   = ps.project_id
        FROM project_staffing ps
        WHERE ps.id = tm.project_staffing_id
    """)

    # Old FKs (CASCADE like the original)
    op.create_foreign_key(
        "fk_task_monitors_employees",
        source_table="task_monitors",
        referent_table="employees",
        local_cols=["employees_id"],
        remote_cols=["employees_id"],
        ondelete="CASCADE",
    )
    op.create_foreign_key(
        "fk_task_monitors_projects",
        source_table="task_monitors",
        referent_table="projects",
        local_cols=["project_id"],
        remote_cols=["project_id"],
        ondelete="CASCADE",
    )

    # NOT NULL
    op.alter_column("task_monitors", "employees_id", nullable=False)
    op.alter_column("task_monitors", "project_id", nullable=False)

    # Drop new FK + column
    op.drop_constraint("fk_task_monitors_project_staffing_restrict", "task_monitors", type_="foreignkey")
    with op.batch_alter_table("task_monitors") as batch:
        batch.drop_column("project_staffing_id")

    # project_staffing FKs back to CASCADE
    op.drop_constraint("fk_project_staffing_project_restrict", "project_staffing", type_="foreignkey")
    op.drop_constraint("fk_project_staffing_employee_restrict", "project_staffing", type_="foreignkey")

    op.create_foreign_key(
        "fk_project_staffing_project",
        source_table="project_staffing",
        referent_table="projects",
        local_cols=["project_id"],
        remote_cols=["project_id"],
        ondelete="CASCADE",
    )
    op.create_foreign_key(
        "fk_project_staffing_employee",
        source_table="project_staffing",
        referent_table="employees",
        local_cols=["employees_id"],
        remote_cols=["employees_id"],
        ondelete="CASCADE",
    )

    # employees.role back to SET NULL
    op.drop_constraint("fk_employees_role_restrict", "employees", type_="foreignkey")
    op.create_foreign_key(
        "fk_employees_role",
        source_table="employees",
        referent_table="roles",
        local_cols=["role"],
        remote_cols=["role_id"],
        ondelete="SET NULL",
    )
    # ### end Alembic commands ###
