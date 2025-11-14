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
        tm, ps, e, p = task_monitors, project_staffing, employees, projects
        query = (
            select(
                # task_monitors fields
                tm.c.task_id,
                tm.c.project_staffing_id,
                tm.c.task_date,
                tm.c.billlable,
                tm.c.task_completed,
                tm.c.task_inprogress,
                tm.c.task_reworked,
                tm.c.task_approved,
                tm.c.task_rejected,
                tm.c.task_reviewed,
                tm.c.hours_logged,
                tm.c.description,
                tm.c.created_at,
                tm.c.updated_at,

                # expose employees_id/project_id via project_staffing (so your mapper sees them)
                ps.c.employees_id.label("employees_id"),
                ps.c.project_id.label("project_id"),

                # employees
                e.c.first_name.label("first_name"),
                e.c.last_name.label("last_name"),

                # projects
                p.c.project_name.label("project_name"),

                # staffing manager fields
                ps.c.gms_manager.label("manager"),
                ps.c.t_manager.label("lead"),
                ps.c.pod_lead.label("pod_lead"),
            )
            .select_from(
                tm.join(ps, ps.c.id == tm.c.project_staffing_id)
              .join(e, e.c.employees_id == ps.c.employees_id)
              .join(p, p.c.project_id == ps.c.project_id)
            )
            .order_by(tm.c.task_date.desc(), tm.c.task_id.desc())
            .limit(limit)
            .offset(offset)
        )
        if employees_id:
            query = query.where(tm.c.employees_id == employees_id)
        if project_id:
            query = query.where(tm.c.project_id == project_id)
        if date_from:
            query = query.where(tm.c.task_date >= date_from)
        if date_to:
            query = query.where(tm.c.task_date <= date_to)

        try:
            rows = await database.fetch_all(query)
            return [TaskMonitorsCurd._row_to_output(r) for r in rows]
        except Exception as exc:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Failed to list task monitors: {exc}")
    
    ## Task by ID
    @staticmethod
    async def find_task_by_id(task_id: int) -> TaskMonitorBase | None:
        tm, ps, e, p = task_monitors, project_staffing, employees, projects
        query = (
            select(
                # task_monitors fields
                tm.c.task_id,
                tm.c.project_staffing_id,
                tm.c.task_date,
                tm.c.billable,
                tm.c.task_completed,
                tm.c.task_inprogress,
                tm.c.task_reworked,
                tm.c.task_approved,
                tm.c.task_rejected,
                tm.c.task_reviewed,
                tm.c.hours_logged,
                tm.c.description,
                tm.c.created_at,
                tm.c.updated_at,

                # expose employees_id/project_id via project_staffing (so your mapper sees them)
                ps.c.employees_id.label("employees_id"),
                ps.c.project_id.label("project_id"),

                # employees
                e.c.first_name.label("first_name"),
                e.c.last_name.label("last_name"),

                # projects
                p.c.project_name.label("project_name"),

                # staffing manager fields
                ps.c.gms_manager.label("manager"),
                ps.c.t_manager.label("lead"),
                ps.c.pod_lead.label("pod_lead"),
                )
                .select_from(
                    tm.join(ps, ps.c.id == tm.c.project_staffing_id)
                    .join(e, e.c.employees_id == ps.c.employees_id)
                    .join(p, p.c.project_id == ps.c.project_id)
                )
                .where(tm.c.task_id == task_id)
        )
        try:
            row = await database.fetch_one(query)
            if not row:
                raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Task '{task_id}' not found")
            return TaskMonitorsCurd._row_to_output(row)
        except HTTPException:
            raise
        except Exception as exc:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Failed to fetch task monitor: {exc}")

    ## Tasks register
    @staticmethod
    async def register_task(task: TaskMonitorCreate) -> TaskMonitorBase | None:
        try:
            # 1) Resolve staffing row
            ps_q = (
                select(project_staffing.c.id)
                .where(
                    and_(
                        project_staffing.c.project_id == task.project_id,
                        project_staffing.c.employees_id == task.employees_id,
                    )
                )
            )
            ps_row = await database.fetch_one(ps_q)
            if not ps_row:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail=(
                        f"No project_staffing found for project_id={task.project_id} "
                        f"and employees_id='{task.employees_id}'. Assign the trainer to the project first."
                    ),
                )
            ps_id = ps_row["id"]

            # 2) Uniqueness check: one row per (project_staffing_id, task_date)
            dup_q = (
                select(task_monitors.c.task_id)
                .where(
                    and_(
                        task_monitors.c.project_staffing_id == ps_id,
                        task_monitors.c.task_date == task.task_date,
                    )
                )
            )
            dup = await database.fetch_one(dup_q)
            if dup:
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail=(
                        "A task entry already exists for this trainer/project on "
                        f"{task.task_date} (staffing_id={ps_id}, employees_id='{task.employees_id}' and project_id={task.project_id})."
                    ),
                )

            # 3) Insert
            ins = (
                insert(task_monitors)
                .values(
                    project_staffing_id = ps_id,
                    task_date           = task.task_date,
                    billable            = task.billable,
                    task_completed      = task.task_completed,
                    task_inprogress     = task.task_inprogress,
                    task_reworked       = task.task_reworked,
                    task_approved       = task.task_approved,
                    task_rejected       = task.task_rejected,
                    task_reviewed       = task.task_reviewed,
                    hours_logged        = task.hours_logged,
                    description         = getattr(task, "description", None),
                )
                .returning(*task_monitors.c)
            )
            row = await database.fetch_one(ins)
            if not row:
                raise HTTPException(status_code=400, detail="Insert failed")

            # 4) Return the expanded row (join with employees/projects)
            return await TaskMonitorsCurd.find_task_by_id(row["task_id"])

        except HTTPException:
            raise
        except Exception as exc:
            # surface real cause for debugging; you can shorten the message in prod
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Failed to create task monitor: {exc}",
            )

    
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
        except Exception as exc:
            raise HTTPException(status_code=400, detail=f"Failed to update task monitor: {exc}")


    @staticmethod
    async def delete_task(task_id: int) -> Dict[str, str]:
        # Ensure exists
        await TaskMonitorsCurd.find_task_by_id(task_id)

        stmt = delete(task_monitors).where(task_monitors.c.task_id == task_id)
        try:
            await database.execute(stmt)
            return {"message": "Task deleted successfully"}
        except Exception as exc:
            # With ON DELETE CASCADE on FKs from task_monitors, this should be fine.
            raise HTTPException(status_code=400, detail=f"Failed to delete task monitor: {exc}")
