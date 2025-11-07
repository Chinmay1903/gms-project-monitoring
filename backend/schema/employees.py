from __future__ import annotations
from typing import Optional, Literal
from pydantic import BaseModel, Field, EmailStr, condecimal, constr
from datetime import date, datetime
from decimal import Decimal

EmployeeId   = constr(strip_whitespace=True, min_length=1, max_length=36)
RoleId       = constr(strip_whitespace=True, min_length=1, max_length=36)
PhoneStr     = constr(pattern=r'^\+?[0-9]{7,15}$')
GenderStr    = constr(strip_whitespace=True, max_length=1, pattern=r'^[MFO]$')  # M, F, O
Experience   = condecimal(max_digits=4, decimal_places=1, ge=0)
StatusFlag   = Literal['0', '1']

## Model for Employees Table
class EmployeesList(BaseModel):
    employees_id  : str = Field(..., description="Unique identifier for the employee")
    first_name    : str = Field(..., description="First name of the employee")
    last_name     : Optional[str] = Field(None, description="Last name of the employee")
    email         : EmailStr
    phone         : Optional[str] = Field(None, description="Phone number of the employee")
    gender        : Optional[str] = Field(None, description="Gender of the employee")
    designation   : Optional[str] = Field(None, description="Designation of the employee")
    role          : Optional[str] = Field(None, description="Role of the employee")
    role_name     : Optional[str] = Field(None, description="Role name of the employee")
    skill         : Optional[str] = Field(None, description="Skill of the employee")
    experience    : Optional[Decimal] = Field(None, description="Experience of the employee")
    qualification : Optional[str] = Field(None, description="Qualification of the employee")
    state         : Optional[str] = Field(None, description="State of the employee")
    city          : Optional[str] = Field(None, description="City of the employee")
    active_at     : Optional[date] = Field(..., description="Date when the employee became active")
    inactive_at   : Optional[date] = Field(None, description="Date when the employee became inactive")
    status        : StatusFlag = Field(..., description="Status of the employee: '1' active, '0' inactive")
    created_at    : Optional[datetime] = Field(..., description="Timestamp when the employee record was created")
    updated_at    : Optional[datetime] = Field(..., description="Timestamp when the employee record was last updated")

class EmployeesEntry(BaseModel):
    employees_id  : EmployeeId
    first_name    : constr(strip_whitespace=True, min_length=1, max_length=100) = Field(..., description="First name of the employee")  
    last_name     : Optional[constr(strip_whitespace=True, max_length=100)] = Field(None, description="Last name of the employee")
    email         : EmailStr
    phone         : Optional[PhoneStr] = Field(None, description="Phone number with country code, e.g., +1234567890")
    gender        : Optional[GenderStr] = Field(None, description="Gender: 'M', 'F', 'O'")
    designation   : Optional[constr(strip_whitespace=True, max_length=100)] = Field(None, description="Job title or designation")
    role          : Optional[RoleId] = Field(None, description="FK to roles.role_id")
    skill         : Optional[constr(strip_whitespace=True, max_length=255)] = Field(None, description="Skills possessed by the employee")
    experience    : Optional[Experience] = Field(None, description="Years of experience")
    qualification : Optional[constr(strip_whitespace=True, max_length=255)] = Field(None, description="Highest qualification attained")
    state         : Optional[constr(strip_whitespace=True, max_length=100)] = Field(None, description="State of residence")
    city          : Optional[constr(strip_whitespace=True, max_length=100)] = Field(None, description="City of residence")
    active_at     : Optional[date] = Field(default_factory=date.today, description="Date when the employee became active")
    inactive_at   : Optional[date] = Field(None, description="Date when the employee became inactive")
    status        : Optional[StatusFlag] = Field('1', description="Active='1', Inactive='0'")


class EmployeesUpdate(BaseModel):
    first_name    : constr(strip_whitespace=True, min_length=1, max_length=100) = Field(..., description="First name of the employee")  
    last_name     : Optional[constr(strip_whitespace=True, max_length=100)] = Field(None, description="Last name of the employee")
    email         : EmailStr
    phone         : Optional[PhoneStr] = Field(None, description="Phone number with country code, e.g., +1234567890")
    gender        : Optional[GenderStr] = Field(None, description="Gender: 'M', 'F', 'O'")
    designation   : Optional[constr(strip_whitespace=True, max_length=100)] = Field(None, description="Job title or designation")
    role          : Optional[RoleId] = Field(None, description="FK to roles.role_id")
    skill         : Optional[constr(strip_whitespace=True, max_length=255)] = Field(None, description="Skills possessed by the employee")
    experience    : Optional[Experience] = Field(None, description="Years of experience")
    qualification : Optional[constr(strip_whitespace=True, max_length=255)] = Field(None, description="Highest qualification attained")
    state         : Optional[constr(strip_whitespace=True, max_length=100)] = Field(None, description="State of residence")
    city          : Optional[constr(strip_whitespace=True, max_length=100)] = Field(None, description="City of residence")
    active_at     : Optional[date] = Field(default_factory=date.today, description="Date when the employee became active")
    inactive_at   : Optional[date] = Field(None, description="Date when the employee became inactive")
    status        : Optional[StatusFlag] = Field('1', description="Active='1', Inactive='0'")
