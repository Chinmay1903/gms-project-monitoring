from typing import Optional
from pydantic import BaseModel, Field

## Model for Employees Table
class EmployeesList(BaseModel):
    employees_id        : str
    first_name          : str
    last_name           : str
    email               : str
    phone               : str
    gender              : str
    designation         : str
    role                : str
    role_name           : Optional[str] = None
    skill               : str
    experience          : str
    qualification       : str
    state               : str
    city                : str
    create_at           : str
    inactive_at         : str | None = None
    status              : str
class EmployeesEntry(BaseModel):
    employees_id        : str = Field(..., example="potinejj")
    first_name          : str = Field(..., example="Potine")
    last_name           : str = Field(..., example="Sambo")
    email               : str = Field(..., example="Sambo")
    phone               : str = Field(..., example="Sambo")
    gender              : str = Field(..., example="Male")
    designation         : str = Field(..., example="Designation")
    role                : str = Field(...,example="Trainer")
    skill               : str = Field(...,example="Skill")
    experience          : str = Field(...,example="Experience")
    qualification       : str = Field(...,example="Qualification")
    state               : str = Field(...,example="State")
    city                : str = Field(...,example="City")
class EmployeesUpdate(BaseModel):
    first_name          : str = Field(..., example="Potine")
    last_name           : str = Field(..., example="Sambo")
    email               : str = Field(..., example="Sambo")
    phone               : str = Field(..., example="Sambo")
    gender              : str = Field(..., example="M")
    designation         : str = Field(..., example="Designation")
    role                : str = Field(..., example="Trainer")
    skill               : str = Field(...,example="Skill")
    experience          : str = Field(...,example="Experience")
    qualification       : str = Field(...,example="Qualification")
    state               : str = Field(...,example="State")
    city                : str = Field(...,example="City")
    inactive_at         : str | None = None
    status              : str = Field(..., example="1")
