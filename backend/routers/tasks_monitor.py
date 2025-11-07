from fastapi import APIRouter, HTTPException, status
import logging
from typing import List, Dict, Any
from schema.tasks_monitor import TaskMonitorBase, TaskMonitorCreate, TaskMonitorUpdate
from curd.tasks_monitor import TaskMonitorsCurd

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/tasks", tags=["Tasks"])

# Get all Tasks
@router.get("", response_model=List[TaskMonitorBase])
async def find_all_task():
    try:
        return await TaskMonitorsCurd.find_all_task()
    except HTTPException as he:
        logger.warning("find_all_task HTTPException: %s", he.detail)
        raise
    except Exception as exc:
        logger.exception("Failed to list tasks")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={"message": "Failed to list tasks", "error": str(exc)},
        )

# Register Task
@router.post("", response_model=TaskMonitorBase)
async def register_task(task: TaskMonitorCreate):
    try:
        return await TaskMonitorsCurd.register_task(task)
    except HTTPException as he:
        logger.warning("register_task HTTPException: %s", he.detail)
        raise
    except Exception as exc:
        logger.exception("Failed to create task")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={"message": "Failed to create task", "error": str(exc)},
        )

# Get Task by ID
@router.get("/{task_id}", response_model=TaskMonitorBase)
async def find_task_by_id(task_id: int):
    try:
        result = await TaskMonitorsCurd.find_task_by_id(task_id)
        if not result:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Task '{task_id}' not found",
            )
        return result
    except HTTPException as he:
        logger.warning("find_task_by_id HTTPException (task_id=%s): %s", task_id, he.detail)
        raise
    except Exception as exc:
        logger.exception("Failed to get task (task_id=%s)", task_id)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={"message": f"Failed to fetch task '{task_id}'", "error": str(exc)},
        )

# Update Task
@router.put("/{task_id}", response_model=TaskMonitorBase)
async def update_task(task_id: int, task: TaskMonitorUpdate):
    try:
        return await TaskMonitorsCurd.update_task(task_id, task)
    except HTTPException as he:
        logger.warning("update_task HTTPException (task_id=%s): %s", task_id, he.detail)
        raise
    except Exception as exc:
        logger.exception("Failed to update task (task_id=%s)", task_id)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={"message": f"Failed to update task '{task_id}'", "error": str(exc)},
        )

# Delete Task
@router.delete("/{task_id}")
async def delete_task(task_id: int) -> Dict[str, Any]:
    try:
        return await TaskMonitorsCurd.delete_task(task_id)
    except HTTPException as he:
        logger.warning("delete_task HTTPException (task_id=%s): %s", task_id, he.detail)
        raise
    except Exception as exc:
        logger.exception("Failed to delete task (task_id=%s)", task_id)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={"message": f"Failed to delete task '{task_id}'", "error": str(exc)},
        )
