from pydantic import BaseModel,Field
from typing import Optional, Annotated
from datetime import date, datetime
from decimal import Decimal

# define alias for constrained decimal
HoursLogged = Annotated[Decimal, Field(max_digits=4, decimal_places=2, ge=0.00)]

# define alias for constrained int (non-negative)
NonNegativeInt = Annotated[int, Field(ge=0)]

class TaskMonitorBase(BaseModel):
    """Base schema for task monitor response"""
    task_id         : int = Field(..., description="Unique identifier for the task entry")
    employees_id    : str = Field(..., description="Unique identifier for the employee")
    project_id      : int = Field(..., description="Unique identifier for the project")
    task_date       : date = Field(..., description="Date of the task entry")
    task_completed  : NonNegativeInt = Field(0, description="Number of tasks completed")
    task_inprogress : NonNegativeInt = Field(0, description="Number of tasks in progress")
    task_reworked   : NonNegativeInt = Field(0, description="Number of tasks reworked")
    task_approved   : NonNegativeInt = Field(0, description="Number of tasks approved")
    task_rejected   : NonNegativeInt = Field(0, description="Number of tasks rejected")
    task_reviewed   : NonNegativeInt = Field(0, description="Number of tasks reviewed")
    hours_logged    : HoursLogged = Field(0.00, description="Hours logged")
    description     : Optional[str] = Field(None, description="Description of the tasks")
    project_name    : Optional[str] = Field(None, description="Name of the project")
    manager         : Optional[str] = Field(None, description="Name of the manager")
    lead            : Optional[str] = Field(None, description="Name of the lead")
    pod_lead        : Optional[str] = Field(None, description="Name of the POD lead")
    first_name      : Optional[str] = Field(None, description="First name of the trainer")
    last_name       : Optional[str] = Field(None, description="Last name of the trainer")
    created_at      : datetime = Field(..., description="Timestamp when the employee record was created")
    updated_at      : datetime = Field(..., description="Timestamp when the employee record was last updated")


class TaskMonitorCreate(BaseModel):
    """Schema for creating new task monitor entry"""
    employees_id    : str = Field(..., description="Unique identifier for the employee")
    project_id      : int = Field(..., description="Unique identifier for the project")
    task_date       : date = Field(..., description="Date of the task entry")
    task_completed  : NonNegativeInt = Field(0, description="Number of tasks completed")
    task_inprogress : NonNegativeInt = Field(0, description="Number of tasks in progress")
    task_reworked   : NonNegativeInt = Field(0, description="Number of tasks reworked")
    task_approved   : NonNegativeInt = Field(0, description="Number of tasks approved")
    task_rejected   : NonNegativeInt = Field(0, description="Number of tasks rejected")
    task_reviewed   : NonNegativeInt = Field(0, description="Number of tasks reviewed")
    hours_logged    : HoursLogged = Field(0.00, description="Hours logged")
    description     : Optional[str] = Field(None, description="Description of the tasks")



class TaskMonitorUpdate(BaseModel):
    """Schema for updating task monitor entry (all fields optional)"""
    employees_id    : str = Field(..., description="Unique identifier for the employee")
    project_id      : int = Field(..., description="Unique identifier for the project")
    task_date       : Optional[date] = Field(None, description="Date of the task entry")
    task_completed  : Optional[NonNegativeInt] = Field(0, description="Number of tasks completed")
    task_inprogress : Optional[NonNegativeInt] = Field(0, description="Number of tasks in progress")
    task_reworked   : Optional[NonNegativeInt] = Field(0, description="Number of tasks reworked")
    task_approved   : Optional[NonNegativeInt] = Field(0, description="Number of tasks approved")
    task_rejected   : Optional[NonNegativeInt] = Field(0, description="Number of tasks rejected")
    task_reviewed   : Optional[NonNegativeInt] = Field(0, description="Number of tasks reviewed")
    hours_logged    : Optional[HoursLogged] = Field(0.00, description="Hours logged")
    description     : Optional[str] = Field(None, description="Description of the tasks")
