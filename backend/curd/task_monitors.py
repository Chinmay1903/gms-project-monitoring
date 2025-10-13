import datetime, uuid
from schema.task_monitors import TaskMonitorBase,TaskMonitorCreate,TaskMonitorUpdate
from pg_db import database,task_monitors, employees, projects
from sqlalchemy import select, insert, update, delete


## Curd Operation for task_monitor Table

class TaskMonitorsCurd:

    ## All projects
    @staticmethod
    async def find_all_task():
        query = (
            select(
                # task fields (keep what you need)
                task_monitors.c.task_id,
                task_monitors.c.date,
                task_monitors.c.employees_id,
                task_monitors.c.project_id,
                task_monitors.c.task_completed,
                task_monitors.c.task_inprogress,
                task_monitors.c.task_reworked,
                task_monitors.c.task_approved,
                task_monitors.c.task_rejected,
                task_monitors.c.task_reviewed,
                task_monitors.c.hours_logged,

                # from employees table
                employees.c.employees_id.label("employee_id"),
                employees.c.first_name.label("first_name"),
                employees.c.last_name.label("last_name"),

                # from projects table
                projects.c.project_name.label("project_name"),
                projects.c.gms_manager.label("manager"),
                projects.c.lead_name.label("lead"),
                projects.c.pod_name.label("pod_lead"),
            )
            .select_from(
                task_monitors
                .join(employees, employees.c.employees_id == task_monitors.c.employees_id)
                .join(projects, projects.c.project_id == task_monitors.c.project_id)
            )
            .order_by(task_monitors.c.date.desc(), task_monitors.c.task_id.desc())
        )
        rows = await database.fetch_all(query)
        result = []
        for r in rows:
            d = dict(r)  # convert Record to plain dict
            trainer_name = " ".join(filter(None, [d.get("first_name"), d.get("last_name")]))
            # remove raw name parts
            d.pop("first_name", None)
            d.pop("last_name", None)
            d["trainer_name"] = trainer_name
            result.append(d)

        return result
    
    ## Task by ID
    @staticmethod
    async def find_task_by_id(task_id: int):
        query = (
            select(
                # task_monitors
                task_monitors.c.task_id,
                task_monitors.c.date,
                task_monitors.c.employees_id,
                task_monitors.c.project_id,
                task_monitors.c.task_completed,
                task_monitors.c.task_inprogress,
                task_monitors.c.task_reworked,
                task_monitors.c.task_approved,
                task_monitors.c.task_rejected,
                task_monitors.c.task_reviewed,
                task_monitors.c.hours_logged,

                # employees
                employees.c.employees_id.label("employee_id"),
                employees.c.first_name.label("first_name"),
                employees.c.last_name.label("last_name"),

                # projects
                projects.c.project_name.label("project_name"),
                projects.c.gms_manager.label("manager"),
                projects.c.lead_name.label("lead"),
                projects.c.pod_name.label("pod_lead"),
            )
            .select_from(
                task_monitors
                    .join(employees, employees.c.employees_id == task_monitors.c.employees_id)
                    .join(projects, projects.c.project_id == task_monitors.c.project_id)
            ).where(task_monitors.c.task_id == task_id)
        )
        row = await database.fetch_all(query)
        if not row:
            return None

        d = dict(row)
        trainer_name = " ".join(filter(None, [d.pop("first_name", None), d.pop("last_name", None)]))
        d["trainer_name"] = trainer_name
        return d

    ## Tasks register
    @staticmethod
    async def register_task(task: TaskMonitorCreate):
        query = (
            insert(task_monitors)
            .values(
                employees_id        =task.employees_id,
                project_id          =task.project_id,
                date                =task.date,
                task_completed      =task.task_completed,
                task_inprogress     =task.task_inprogress,
                task_reworked       =task.task_reworked,
                task_approved       =task.task_approved,
                task_rejected       =task.task_rejected,
                task_reviewed       =task.task_reviewed,
                hours_logged        =task.hours_logged,
            )
            .returning(task_monitors)   # ✅ return inserted row
        )
        row = await database.fetch_one(query)
        if not row:
            return None

        task_id = row["task_id"]
        # 2) reuse the expanded fetch (joins to employees & projects)
        return await TaskMonitorsCurd.find_task_by_id(task_id)

    
    ## Update task_monitors
    @staticmethod
    async def update_task(task_id: int, task: TaskMonitorUpdate):
        update_data = {k: v for k, v in task.dict().items() if v is not None}
        if not update_data:
            return {"message": "No fields to update"}

        query = (
            task_monitors.update()
            .where(task_monitors.c.task_id == task_id)
            .values(**update_data)
            .returning(task_monitors)   # ✅ return updated row directly
        )
        row = await database.fetch_one(query)  # ✅ execute and fetch row
        if not row:
            return {"message": "Task ID not found"}
        return TaskMonitorsCurd.find_task_by_id(row["task_id"])

    

