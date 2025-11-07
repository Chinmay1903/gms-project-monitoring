from __future__ import annotations
from typing import Optional, Dict, Any, List
from schema.tasks_monitor import TaskMonitorBase,TaskMonitorCreate,TaskMonitorUpdate
from pg_db import database,task_monitors, employees, projects, project_staffing
from fastapi import HTTPException, status
from sqlalchemy import select, insert, update, delete, and_
import sqlalchemy


## Curd Operation for task_monitor Table

class TaskMonitorsCurd:

    # helper
    @staticmethod
    async def _task_exists(employees_id: str, project_id: int, task_date) -> bool:
        q = (
            select(task_monitors.c.task_id)
            .where(
                and_(
                    task_monitors.c.employees_id == employees_id,
                    task_monitors.c.project_id == project_id,
                    task_monitors.c.task_date == task_date,  # make sure your schema uses task_date
                )
            )
            .limit(1)
        )
        return (await database.fetch_one(q)) is not None

    @staticmethod
    def _row_to_output(row: sqlalchemy.engine.Row | dict) -> Dict[str, Any]:
        """Map DB row to API output dict. Ensures name fields & 'date' alias."""
        d = dict(row)
        # Compose trainer_name if you want; schemas already expose first/last
        # Make sure 'date' is present to satisfy schema (maps from 'task_date')
        if "task_date" in d and "date" not in d:
            d["date"] = d["task_date"]
        return d

    ## All projects
    @staticmethod
    async def find_all_task(
        limit: int = 100,
        offset: int = 0,
        employees_id: Optional[str] = None,
        project_id: Optional[int] = None,
        date_from: Optional[str] = None,   # 'YYYY-MM-DD'
        date_to: Optional[str] = None,     # 'YYYY-MM-DD'
        ) -> List[TaskMonitorBase]  | None:
        query = (
            select(
                # task fields (keep what you need)
                task_monitors.c.task_id,
                task_monitors.c.task_date,
                task_monitors.c.employees_id,
                task_monitors.c.project_id,
                task_monitors.c.task_completed,
                task_monitors.c.task_inprogress,
                task_monitors.c.task_reworked,
                task_monitors.c.task_approved,
                task_monitors.c.task_rejected,
                task_monitors.c.task_reviewed,
                task_monitors.c.hours_logged,
                task_monitors.c.description,
                task_monitors.c.created_at,
                task_monitors.c.updated_at,

                # from employees table
                employees.c.first_name.label("first_name"),
                employees.c.last_name.label("last_name"),

                # from projects table
                projects.c.project_name.label("project_name"),
                project_staffing.c.gms_manager.label("manager"),
                project_staffing.c.t_manager.label("lead"),
                project_staffing.c.pod_lead.label("pod_lead"),
            )
            .select_from(
                task_monitors
                .join(employees, employees.c.employees_id == task_monitors.c.employees_id)
                .join(projects, projects.c.project_id == task_monitors.c.project_id)
                .outerjoin(
                    project_staffing,
                    and_(
                        project_staffing.c.project_id == task_monitors.c.project_id,
                        project_staffing.c.employees_id == task_monitors.c.employees_id
                    )
                )
            )
            .order_by(task_monitors.c.task_date.desc(), task_monitors.c.task_id.desc())
            .limit(limit)
            .offset(offset)
        )
        if employees_id:
            query = query.where(task_monitors.c.employees_id == employees_id)
        if project_id:
            query = query.where(task_monitors.c.project_id == project_id)
        if date_from:
            query = query.where(task_monitors.c.task_date >= date_from)
        if date_to:
            query = query.where(task_monitors.c.task_date <= date_to)

        try:
            rows = await database.fetch_all(query)
            return [TaskMonitorsCurd._row_to_output(r) for r in rows]
        except Exception:
            raise HTTPException(status_code=400, detail="Failed to list task monitors")
    
    ## Task by ID
    @staticmethod
    async def find_task_by_id(task_id: int) -> TaskMonitorBase | None:
        query = (
            select(
                task_monitors.c.task_id,
                task_monitors.c.task_date,
                task_monitors.c.employees_id,
                task_monitors.c.project_id,
                task_monitors.c.task_completed,
                task_monitors.c.task_inprogress,
                task_monitors.c.task_reworked,
                task_monitors.c.task_approved,
                task_monitors.c.task_rejected,
                task_monitors.c.task_reviewed,
                task_monitors.c.hours_logged,
                task_monitors.c.description,
                task_monitors.c.created_at,
                task_monitors.c.updated_at,
                employees.c.first_name,
                employees.c.last_name,
                projects.c.project_name,
                project_staffing.c.gms_manager.label("manager"),
                project_staffing.c.t_manager.label("lead"),
                project_staffing.c.pod_lead.label("pod_lead"),
            )
            .select_from(
                task_monitors.join(employees, employees.c.employees_id == task_monitors.c.employees_id)
                  .join(projects, projects.c.project_id == task_monitors.c.project_id)
                  .outerjoin(
                      project_staffing,
                      and_(project_staffing.c.project_id == task_monitors.c.project_id,
                           project_staffing.c.employees_id == task_monitors.c.employees_id)
                  )
            )
            .where(task_monitors.c.task_id == task_id)
        )
        try:
            row = await database.fetch_one(query)
            if not row:
                raise HTTPException(status_code=404, detail=f"Task '{task_id}' not found")
            return TaskMonitorsCurd._row_to_output(row)
        except HTTPException:
            raise
        except Exception:
            raise HTTPException(status_code=400, detail="Failed to fetch task monitor")

    ## Tasks register
    @staticmethod
    async def register_task(task: TaskMonitorCreate) -> TaskMonitorBase | None:

        query = (
            insert(task_monitors)
            .values(
                employees_id   = task.employees_id,
                project_id     = task.project_id,
                task_date      = task.task_date,            # map schema 'date' -> column 'task_date'
                task_completed = task.task_completed,
                task_inprogress= task.task_inprogress,
                task_reworked  = task.task_reworked,
                task_approved  = task.task_approved,
                task_rejected  = task.task_rejected,
                task_reviewed  = task.task_reviewed,
                hours_logged   = task.hours_logged,
                description    = task.description,          
            )
            .returning(*task_monitors.c)   # ✅ return inserted row
        )
        try:
            row = await database.fetch_one(query)   
            if not row:
                raise HTTPException(status_code=400, detail="Insert failed")
            # Return expanded (with joins)
            return await TaskMonitorsCurd.find_task_by_id(row["task_id"])
            # return row
        except HTTPException:
            raise
        except Exception:
            raise HTTPException(status_code=400, detail="Failed to create task monitor")

    
    ## Update task_monitors
    @staticmethod
    async def update_task(task_id: int, task: TaskMonitorUpdate) -> TaskMonitorBase | None:
        # Ensure row exists first (for a nicer 404)
        await TaskMonitorsCurd.find_task_by_id(task_id)
        # Build partial payload
        update_data = {k: v for k, v in task.dict(exclude_unset=True).items() if v is not None}
        if not update_data:
            # Nothing to change; return current row
            return await TaskMonitorsCurd.find_task_by_id(task_id)

        query = (
            task_monitors.update()
            .where(task_monitors.c.task_id == task_id)
            .values(**update_data)
            .returning(*task_monitors.c)   # ✅ return updated row directly
        )
        
        try:
            row = await database.fetch_one(query)  # ✅ execute and fetch row
            if not row:
                # Highly unlikely after the pre-check, but safe:
                raise HTTPException(status_code=404, detail="Task not found after update")
            return await TaskMonitorsCurd.find_task_by_id(row["task_id"])
        except HTTPException:
            raise
        except Exception:
            raise HTTPException(status_code=400, detail="Failed to update task monitor")


    @staticmethod
    async def delete_task(task_id: int) -> Dict[str, str]:
        # Ensure exists
        await TaskMonitorsCurd.find_task_by_id(task_id)

        stmt = delete(task_monitors).where(task_monitors.c.task_id == task_id)
        try:
            await database.execute(stmt)
            return {"message": "Task deleted successfully"}
        except Exception:
            # With ON DELETE CASCADE on FKs from task_monitors, this should be fine.
            raise HTTPException(status_code=400, detail="Failed to delete task monitor")
