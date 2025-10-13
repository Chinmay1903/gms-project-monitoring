import databases, sqlalchemy
import os
from dotenv import load_dotenv

load_dotenv()

## Postgres Database
DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://postgres:Pathak%40123@localhost:5432/GMS_database")

database = databases.Database(DATABASE_URL)
metadata = sqlalchemy.MetaData()

## Create a User Table.
users = sqlalchemy.Table(
    "users",
    metadata,
    sqlalchemy.Column("id"        , sqlalchemy.String, primary_key=True),
    sqlalchemy.Column("username"  , sqlalchemy.String),
    sqlalchemy.Column("password"  , sqlalchemy.String),
    sqlalchemy.Column("first_name", sqlalchemy.String),
    sqlalchemy.Column("last_name" , sqlalchemy.String),
    sqlalchemy.Column("gender"    , sqlalchemy.CHAR  ),
    sqlalchemy.Column("create_at" , sqlalchemy.String),
    sqlalchemy.Column("status"    , sqlalchemy.CHAR  ),
)

## Create a Employees Table.
employees = sqlalchemy.Table(
    "employees",
    metadata,

    sqlalchemy.Column("employees_id"        , sqlalchemy.String, primary_key=True),
    sqlalchemy.Column("first_name"          , sqlalchemy.String),
    sqlalchemy.Column("last_name"           , sqlalchemy.String),
    sqlalchemy.Column("email"               , sqlalchemy.String),
    sqlalchemy.Column("phone"               , sqlalchemy.String),
    sqlalchemy.Column("gender"              , sqlalchemy.String),
    sqlalchemy.Column("designation"         , sqlalchemy.String),
    sqlalchemy.Column("role"                , sqlalchemy.String, sqlalchemy.ForeignKey("roles.role_id")),
    sqlalchemy.Column("skill"               , sqlalchemy.String),
    sqlalchemy.Column("experience"          , sqlalchemy.String),
    sqlalchemy.Column("qualification"       , sqlalchemy.String),
    sqlalchemy.Column("state"               , sqlalchemy.String),
    sqlalchemy.Column("city"                , sqlalchemy.String),
    sqlalchemy.Column("create_at"           , sqlalchemy.String),
    sqlalchemy.Column("inactive_at"         , sqlalchemy.String, nullable=True),
    sqlalchemy.Column("status"              , sqlalchemy.CHAR),
)


## Create a Roles Table
roles = sqlalchemy.Table(
    "roles",
    metadata,
    sqlalchemy.Column("role_id",    sqlalchemy.String, primary_key=True),
    sqlalchemy.Column("role_name",  sqlalchemy.String, unique=True, nullable=False),
    sqlalchemy.Column("create_at",  sqlalchemy.String),
)

## Create a Project Table
projects = sqlalchemy.Table(
    "projects",
    metadata,
    sqlalchemy.Column("project_id",    sqlalchemy.Integer, sqlalchemy.Identity(start=101,cycle=True), primary_key=True),
    sqlalchemy.Column("project_name",  sqlalchemy.String, nullable=False),
    sqlalchemy.Column("gms_manager",  sqlalchemy.String, nullable=False),
    sqlalchemy.Column("lead_name",  sqlalchemy.String, nullable=False),
    sqlalchemy.Column("pod_name",  sqlalchemy.String, nullable=False),
    sqlalchemy.Column("trainer_name",  sqlalchemy.String, nullable=False),
    sqlalchemy.Column("create_at",  sqlalchemy.String),
    sqlalchemy.Column("status",  sqlalchemy.CHAR, nullable=False, server_default="1"),
    sqlalchemy.Column("inactive_at",  sqlalchemy.Date, nullable=True),
)

## Create a task_monitor table
task_monitors = sqlalchemy.Table(
    "task_monitors",
    metadata,
    sqlalchemy.Column("task_id",           sqlalchemy.Integer, sqlalchemy.Identity(start=1,cycle=True), primary_key=True),
    sqlalchemy.Column("employees_id",      sqlalchemy.String,sqlalchemy.ForeignKey("employees.employees_id")),
    sqlalchemy.Column("project_id",        sqlalchemy.Integer,sqlalchemy.ForeignKey("projects.project_id")),
    sqlalchemy.Column("date",          	   sqlalchemy.Date, nullable=False),
    sqlalchemy.Column("task_completed",    sqlalchemy.Integer, nullable=False, server_default="0"),
    sqlalchemy.Column("task_inprogress",   sqlalchemy.Integer, nullable=False, server_default="0"),
    sqlalchemy.Column("task_reworked",     sqlalchemy.Integer, nullable=False, server_default="0"),
    sqlalchemy.Column("task_approved",     sqlalchemy.Integer, nullable=False, server_default="0"),
    sqlalchemy.Column("task_rejected",     sqlalchemy.Integer, nullable=False, server_default="0"),
    sqlalchemy.Column("task_reviewed",     sqlalchemy.Integer, nullable=False, server_default="0"), ## How many task reviewed by POD/Reviewer
    sqlalchemy.Column("hours_logged",      sqlalchemy.DECIMAL(4, 2), nullable=False, server_default="0.0"),
)


engine = sqlalchemy.create_engine(
    DATABASE_URL
)
metadata.create_all(engine)