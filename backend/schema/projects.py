from datetime import date
from typing import Optional
from pydantic import BaseModel, Field

## Models for Projects Table
class ProjectsList(BaseModel):
    project_id    : int
    project_name  : str
    gms_manager   : str
    lead_name     : str
    pod_name      : str
    trainer_name  : str
    create_at     : str
    inactive_at   : Optional[date] = None
    status        : Optional[str] = "1"
class ProjectsEntry(BaseModel):
    project_name    : str = Field(..., example="Project Name")
    gms_manager     : str = Field(..., example="GMS Manager")
    lead_name       : str = Field(..., example="Lead Name")
    pod_name        : str = Field(..., example="POD Name")
    trainer_name    : str = Field(..., example="Trainer")
    
class ProjectsUpdate(BaseModel):
    #project_id      : int = Field(..., example="Enter Project id")
    project_name    : str = Field(..., example="Project Name")
    gms_manager     : str = Field(..., example="GMS Manager")
    lead_name       : str = Field(..., example="Lead Name")
    pod_name        : str = Field(..., example="POD Name")
    trainer_name    : str = Field(..., example="Trainer")
    inactive_at     : Optional[date] = None
    status          : str = Field(..., example="1")

class ProjectsDelete(BaseModel):
    project_id: int = Field(..., example="Enter Project id")