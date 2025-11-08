from fastapi import APIRouter, HTTPException, status
from typing import List
from schema.projects import TrainerProjectUpdate, ProjectStaffingAdd, ProjectWithStaffingAdd, ProjectsWithTrainer
from curd.projects import ProjectsCurdOperation
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/projects", tags=["Project Details"])

# Get projects by Trainer ID
@router.get("/trainer/{trainer_id}")
async def get_projects_by_trainer(trainer_id: str):
    try:
        return await ProjectsCurdOperation.get_projects_for_trainer(trainer_id)
    except HTTPException:
        raise
    except Exception as exc:
        logger.exception("Failed to fetch projects by trainer")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Failed to fetch projects by trainer: {exc}",
        ) from exc

# Get all projects
@router.get("", response_model=List[ProjectsWithTrainer])
async def find_all_projects():
    try:
        return await ProjectsCurdOperation.find_all_projects_with_trainer()
    except HTTPException:
        raise
    except Exception as exc:
        logger.exception("Failed to list projects with trainer details")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Failed to list projects with trainer details: {exc}",
        ) from exc

# Register Project with Trainer
@router.post("", response_model=ProjectsWithTrainer)
async def register_project(project: ProjectWithStaffingAdd):
    try:
        return await ProjectsCurdOperation.add_project_with_staff(project)
    except HTTPException:
        raise
    except Exception as exc:
        logger.exception("Failed to register project")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Failed to register project: {exc}",
        ) from exc
    
# Assign Trainer to Project
@router.post("/assign_trainer", response_model=ProjectsWithTrainer)
async def assign_trainer_to_project(project: ProjectStaffingAdd):
    try:
        return await ProjectsCurdOperation.add_project_staffing(project)
    except HTTPException:
        raise
    except Exception as exc:
        logger.exception("Failed to assign trainer to project")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Failed to assign trainer to project: {exc}",
        ) from exc

# Get project by ID
@router.get("/{project_Id}", response_model=ProjectsWithTrainer)
async def find_project_by_id(project_Id: int):
    try:
        return await ProjectsCurdOperation.find_project_by_id(project_Id)
    except HTTPException:
        raise
    except Exception as exc:
        logger.exception("Failed to fetch project by id")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Failed to fetch project by id: {exc}",
        ) from exc

# Update project
@router.put("/{project_Id}/{trainer_id}", response_model=ProjectsWithTrainer)
async def update_project(project_Id: int, trainer_id: str, project: TrainerProjectUpdate):
    try:
        return await ProjectsCurdOperation.update_project(project_Id, trainer_id, project)
    except HTTPException:
        raise
    except Exception as exc:
        logger.exception("Failed to update project")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Failed to update project: {exc}",
        ) from exc

# Delete role
@router.delete("/{project_Id}/{trainer_id}")
async def delete_project(project_Id: int,  trainer_id: str):   
    try:
        if trainer_id is None:
            # If your CRUD only supports staffing deletion, guide the caller:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="trainer_id is required to delete staffing for a project. "
                    "Provide ?trainer_id=<employees_id>."
            )
        return await ProjectsCurdOperation.delete_project(project_id=project_Id, trainer_id=trainer_id)
    except HTTPException:
        raise
    except Exception as exc:
        logger.exception("Failed to delete project/staffing")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Failed to delete project/staffing: {exc}",
        ) from exc
