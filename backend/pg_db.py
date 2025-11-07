import os
from datetime import datetime
from dotenv import load_dotenv

import sqlalchemy as sa
from sqlalchemy import CheckConstraint, text, UniqueConstraint, ForeignKey

import databases

load_dotenv()

# Use async driver for `databases` (recommended)
DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "postgresql+asyncpg://postgres:Pathak%40123@localhost:5432/GMS_database"
)

# If you still need a sync engine (e.g., for create_all), keep a separate URL
SYNC_DATABASE_URL = os.getenv(
    "SYNC_DATABASE_URL",
    "postgresql+psycopg2://postgres:Pathak%40123@localhost:5432/GMS_database"
)

database = databases.Database(DATABASE_URL)
metadata = sa.MetaData()

# Common timestamp columns
def timestamp_columns():
    return [
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        # onupdate=func.now() is client-side; if you need true server-side, use a trigger
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    ]

# USERS
users = sa.Table(
    "users",
    metadata,
    sa.Column("id", sa.String(36), primary_key=True),         # consider UUID if you can
    sa.Column("username", sa.String(150), unique=True, nullable=False),
    sa.Column("password", sa.String(255), nullable=False),
    sa.Column("first_name", sa.String(100), nullable=True),
    sa.Column("last_name", sa.String(100), nullable=True),
    sa.Column("gender", sa.String(10), nullable=True),        # or Enum(...) if you want
    sa.Column("status", sa.CHAR(1), nullable=False, server_default=text("'1'")),  # '1' active, '0' inactive
    *timestamp_columns(),
    CheckConstraint("status in ('0','1')", name="ck_status_01")
)

# ROLES
roles = sa.Table(
    "roles",
    metadata,
    sa.Column("role_id", sa.String(36), primary_key=True),
    sa.Column("role_name", sa.String(100), unique=True, nullable=False),
    *timestamp_columns(),
)

# EMPLOYEES
employees = sa.Table(
    "employees",
    metadata,
    sa.Column("employees_id", sa.String(36), primary_key=True),
    sa.Column("first_name", sa.String(100), nullable=False),
    sa.Column("last_name", sa.String(100), nullable=True),
    sa.Column("email", sa.String(255), nullable=False),
    sa.Column("phone", sa.String(20), nullable=True),
    sa.Column("gender", sa.CHAR(1), nullable=True),
    sa.Column("designation", sa.String(100), nullable=True),
    sa.Column("role", sa.String(36), ForeignKey("roles.role_id", ondelete="SET NULL"), nullable=True),
    sa.Column("skill", sa.String(255), nullable=True),
    sa.Column("experience", sa.Numeric(4, 1), nullable=True),  # e.g., 3.5 years
    sa.Column("qualification", sa.String(255), nullable=True),
    sa.Column("state", sa.String(100), nullable=True),
    sa.Column("city", sa.String(100), nullable=True),
    sa.Column("active_at", sa.Date, nullable=False, server_default=sa.func.current_date()),
    sa.Column("inactive_at", sa.Date, nullable=True),
    sa.Column("status", sa.CHAR(1), nullable=False, server_default=text("'1'")),
    *timestamp_columns(),
    CheckConstraint("status in ('0','1')", name="ck_status_01"),
    UniqueConstraint("email", name="uq_employee_email"),
)

# PROJECTS
projects = sa.Table(
    "projects",
    metadata,
    sa.Column("project_id", sa.Integer, sa.Identity(start=101, cycle=True), primary_key=True),
    sa.Column("project_name", sa.String(200), nullable=False),
    sa.Column("active_at", sa.Date, nullable=False, server_default=sa.func.current_date()),
    sa.Column("status", sa.CHAR(1), nullable=False, server_default=text("'1'")),
    sa.Column("inactive_at", sa.Date, nullable=True),
    *timestamp_columns(),
    CheckConstraint("status in ('0','1')", name="ck_status_01"),
)

# PROJECT STAFFING
project_staffing = sa.Table(
    "project_staffing",
    metadata,
    sa.Column("id", sa.BigInteger, sa.Identity(start=1, cycle=True), primary_key=True),
    sa.Column("project_id", sa.Integer, ForeignKey("projects.project_id", ondelete="CASCADE"), nullable=False),
    sa.Column("employees_id", sa.String(50), ForeignKey("employees.employees_id", ondelete="CASCADE"), nullable=False),
    sa.Column("gms_manager", sa.String(150), nullable=True),
    sa.Column("t_manager", sa.String(150), nullable=True),
    sa.Column("pod_lead", sa.String(150), nullable=True),
    *timestamp_columns(),
)

# TASK MONITORS
task_monitors = sa.Table(
    "task_monitors",
    metadata,
    sa.Column("task_id", sa.Integer, sa.Identity(start=1, cycle=True), primary_key=True),
    sa.Column("employees_id", sa.String(36), ForeignKey("employees.employees_id", ondelete="CASCADE"), nullable=False),
    sa.Column("project_id", sa.Integer, ForeignKey("projects.project_id", ondelete="CASCADE"), nullable=False),
    sa.Column("task_date", sa.Date, nullable=False),
    sa.Column("task_completed", sa.Integer, nullable=False, server_default="0"),
    sa.Column("task_inprogress", sa.Integer, nullable=False, server_default="0"),
    sa.Column("task_reworked", sa.Integer, nullable=False, server_default="0"),
    sa.Column("task_approved", sa.Integer, nullable=False, server_default="0"),
    sa.Column("task_rejected", sa.Integer, nullable=False, server_default="0"),
    sa.Column("task_reviewed", sa.Integer, nullable=False, server_default="0"),
    sa.Column("hours_logged", sa.Numeric(4, 2), nullable=False, server_default="0.00"),
    sa.Column("description", sa.Text, nullable=True),
    *timestamp_columns(),
)

# Create tables (sync engine just for schema creation; migrations will own changes later)
sync_engine = sa.create_engine(SYNC_DATABASE_URL, pool_pre_ping=True)
metadata.create_all(sync_engine)
