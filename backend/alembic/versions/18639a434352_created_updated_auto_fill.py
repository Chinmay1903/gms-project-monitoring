"""created & updated auto fill

Revision ID: 18639a434352
Revises: 80964cf19176
Create Date: 2025-10-14 00:22:46.503952

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '18639a434352'
down_revision: Union[str, Sequence[str], None] = '80964cf19176'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

# Tables that should get timestamps
TABLES = ["users", "roles", "employees", "projects", "task_monitors", "project_staffing"]

def upgrade():
    # 1) Ensure columns exist with defaults
    # for t in TABLES:
    #     op.add_column(t, sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False))
    #     op.add_column(t, sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False))

    # 2) Backfill any existing NULLs (defensive—safe to run even if none)
    for t in TABLES:
        op.execute(f"UPDATE {t} SET created_at = COALESCE(created_at, NOW()), updated_at = COALESCE(updated_at, NOW());")

    # 3) Create (or replace) the shared function
    op.execute("""
    CREATE OR REPLACE FUNCTION set_row_timestamps()
    RETURNS TRIGGER AS $$
    BEGIN
      IF TG_OP = 'INSERT' THEN
        IF NEW.created_at IS NULL THEN
          NEW.created_at := NOW();
        END IF;
        NEW.updated_at := COALESCE(NEW.updated_at, NOW());
      ELSIF TG_OP = 'UPDATE' THEN
        NEW.updated_at := NOW();
      END IF;
      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql;
    """)

    # 4) Create triggers on all tables
    for t in TABLES:
        op.execute(f'DROP TRIGGER IF EXISTS trg_{t}_set_timestamps ON {t};')
        op.execute(f"""
        CREATE TRIGGER trg_{t}_set_timestamps
        BEFORE INSERT OR UPDATE ON {t}
        FOR EACH ROW EXECUTE FUNCTION set_row_timestamps();
        """)

def downgrade():
    # Drop triggers first
    for t in TABLES:
        op.execute(f'DROP TRIGGER IF EXISTS trg_{t}_set_timestamps ON {t};')
    # Optionally drop function (only if nothing else uses it)
    # op.execute("DROP FUNCTION IF EXISTS set_row_timestamps();")
    # # Optionally drop columns (usually you keep them)
    # for t in TABLES:
    #     with op.batch_alter_table(t) as batch_op:
    #         batch_op.drop_column("updated_at")
    #         batch_op.drop_column("created_at")

