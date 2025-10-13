from pydantic import BaseModel,Field
from typing import Optional, Annotated
from datetime import date
from decimal import Decimal

# define alias for constrained decimal
HoursLogged = Annotated[Decimal, Field(max_digits=4, decimal_places=2, ge=0.00)]

# define alias for constrained int (non-negative)
NonNegativeInt = Annotated[int, Field(ge=0)]

class TaskMonitorBase(BaseModel):
    """Base schema for task monitor response"""
    task_id         :int
    employees_id    : str
    project_id      : int
    date            : date
    task_completed  : NonNegativeInt = 0
    task_inprogress : NonNegativeInt = 0
    task_reworked   : NonNegativeInt = 0
    task_approved   : NonNegativeInt = 0
    task_rejected   : NonNegativeInt = 0
    task_reviewed   : NonNegativeInt = 0
    hours_logged    : HoursLogged = 0.00  # matches DECIMAL(4,2)
    project_name    : Optional[str]
    manager         : Optional[str]
    lead            : Optional[str]
    pod_lead        : Optional[str]
    trainer_name    : Optional[str]


class TaskMonitorCreate(BaseModel):
    """Schema for creating new task monitor entry"""
    employees_id    : str
    project_id      : int
    date            : date
    task_completed  : NonNegativeInt = 0
    task_inprogress : NonNegativeInt = 0
    task_reworked   : NonNegativeInt = 0
    task_approved   : NonNegativeInt = 0
    task_rejected   : NonNegativeInt = 0
    task_reviewed   : NonNegativeInt = 0
    hours_logged    : HoursLogged = 0.00  # matches DECIMAL(4,2)



class TaskMonitorUpdate(BaseModel):
    """Schema for updating task monitor entry (all fields optional)"""
    employees_id    : str
    project_id      : int
    date            : date
    task_completed  : Optional[NonNegativeInt] = 0
    task_inprogress : Optional[NonNegativeInt] = 0
    task_reworked   : Optional[NonNegativeInt] = 0
    task_approved   : Optional[NonNegativeInt] = 0
    task_rejected   : Optional[NonNegativeInt] = 0
    task_reviewed   : Optional[NonNegativeInt] = 0
    hours_logged    : Optional[HoursLogged] = 0.00



