from datetime import date, datetime
from typing import Optional, Literal
from pydantic import BaseModel, Field, constr

StatusFlag   = Literal['0', '1']

## Models for Projects Table
class Projects(BaseModel):
    project_id    : int              = Field(..., description="Unique identifier for the project")
    project_name  : Optional[str]    = Field(..., description="Name of the project")
    active_at     : Optional[date]   = Field(..., description="Date when the project became active")
    inactive_at   : Optional[date]   = Field(None, description="Date when the project became inactive")
    status        : StatusFlag       = Field(..., description="Status of the project: '1' active, '0' inactive")
    created_at    : datetime         = Field(..., description="Timestamp when the project record was created")
    updated_at    : datetime         = Field(..., description="Timestamp when the project record was last updated")

class ProjectsWithTrainer(Projects):
    staffing_id         : int = Field(..., description="Unique identifier for the trainer project")
    employees_id        : str = Field(..., description="Unique identifier for the employee")
    employee_first_name : Optional[str] = Field(..., description="First name of the employee")
    employee_last_name  : Optional[str] = Field(..., description="Last name of the employee")
    gms_manager         : Optional[str] = Field(..., description="GMS Manager")
    t_manager           : Optional[str] = Field(..., description="Turing Manager")
    pod_lead            : Optional[str] = Field(..., description="POD Lead")
    staffing_created_at : datetime = Field(..., description="Timestamp when the trainer is added to the project")
    staffing_updated_at : datetime = Field(..., description="Timestamp when the trainer is last updated to the project")

class ProjectsAdd(BaseModel):
    project_name  : constr(strip_whitespace=True, min_length=1, max_length=255) = Field(..., description="Name of the project")
    active_at     : date                                              = Field(..., description="Date when the project became active")
    inactive_at   : Optional[date]                                              = Field(None, description="Date when the project became inactive")
    status        : Optional[StatusFlag]                                        = Field(..., description="Status of the project: '1' active, '0' inactive")

class ProjectStaffingAdd(BaseModel):
    project_id    : int = Field(..., description="Unique identifier for the project")
    employees_id  : constr(strip_whitespace=True, min_length=1, max_length=255) = Field(..., description="Unique identifier for the employee")
    gms_manager   : constr(strip_whitespace=True, max_length=150)     = Field(None, description="GMS Manager")
    t_manager     : constr(strip_whitespace=True, max_length=150)     = Field(None, description="Turing Manager")
    pod_lead      : constr(strip_whitespace=True, max_length=150)     = Field(None, description="POD Lead")

class ProjectWithStaffingAdd(ProjectsAdd):
    employees_id  : constr(strip_whitespace=True, min_length=1, max_length=255) = Field(..., description="Unique identifier for the employee")
    gms_manager   : constr(strip_whitespace=True, max_length=150)     = Field(None, description="GMS Manager")
    t_manager     : constr(strip_whitespace=True, max_length=150)     = Field(None, description="Turing Manager")
    pod_lead      : constr(strip_whitespace=True, max_length=150)     = Field(None, description="POD Lead")

class ProjectsUpdate(BaseModel):
    project_name  : constr(strip_whitespace=True, min_length=1, max_length=255) = Field(..., description="Name of the project")
    active_at     : Optional[date]                                              = Field(None, description="Date when the project became active")
    inactive_at   : Optional[date]                                              = Field(None, description="Date when the project became inactive")
    status        : Optional[StatusFlag]                                        = Field(None, description="Status of the project: '1' active, '0' inactive")

class TrainerProjectUpdate(ProjectsUpdate):
    # project_id    : int = Field(..., description="Unique identifier for the project")
    # employees_id  : constr(strip_whitespace=True, min_length=1, max_length=255) = Field(..., description="Unique identifier for the employee")
    gms_manager   : Optional[constr(strip_whitespace=True, max_length=150)]     = Field(None, description="GMS Manager")
    t_manager     : Optional[constr(strip_whitespace=True, max_length=150)]     = Field(None, description="Turing Manager")
    pod_lead      : Optional[constr(strip_whitespace=True, max_length=150)]     = Field(None, description="POD Lead")
