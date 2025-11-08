from __future__ import annotations
from datetime import date, datetime
from operator import and_
from typing import Any, List, Dict
import sqlalchemy
from schema.projects import ProjectsAdd,ProjectStaffingAdd, ProjectWithStaffingAdd, Projects, ProjectsWithTrainer, TrainerProjectUpdate
from pg_db import database,projects, project_staffing, employees
from fastapi import HTTPException, status


## End Point for Projects Table

class ProjectsCurdOperation:

    default_limit = 500
    default_offset = 0

    @staticmethod
    async def _ensure_project_exists(project_id: int) -> None:
        q = sqlalchemy.select(projects.c.project_id).where(projects.c.project_id == project_id)
        if await database.fetch_one(q) is None:
            raise HTTPException(status_code=404, detail=f"Project '{project_id}' not found")

    @staticmethod
    async def _ensure_employee_exists(employees_id: str) -> None:
        q = sqlalchemy.select(employees.c.employees_id).where(employees.c.employees_id == employees_id)
        if await database.fetch_one(q) is None:
            raise HTTPException(status_code=404, detail=f"Employee '{employees_id}' not found")
        
    @staticmethod
    async def _staffing_exists(project_id: int, employees_id: str) -> bool:
        q = sqlalchemy.select(project_staffing.c.id).where(
            sqlalchemy.and_(
                project_staffing.c.project_id == project_id,
                project_staffing.c.employees_id == employees_id,
            )
        )
        return (await database.fetch_one(q)) is not None

    ## All projects only
    @staticmethod
    async def find_all_projects(limit: int = default_limit, offset: int = default_offset, is_active: bool = False) -> List[Projects]: 
        try:
            query = projects.select().order_by(projects.c.project_id.desc()).limit(limit).offset(offset).where(projects.c.status == '1' if is_active else True)
            return await database.fetch_all(query)
        except Exception:
            raise HTTPException(status_code=400, detail="Failed to list projects")

    ## All projects with trainer details
    @staticmethod
    async def find_all_projects_with_trainer(limit: int = default_limit, offset: int = default_offset, is_active: bool = False) -> List[ProjectsWithTrainer]:
        try:
            p, ps, e = projects.alias("p"), project_staffing.alias("ps"), employees.alias("e")
            query = (
                sqlalchemy.select(
                # from project_staffing
                    ps.c.id.label("staffing_id"),
                    ps.c.employees_id,
                    ps.c.gms_manager,
                    ps.c.t_manager,
                    ps.c.pod_lead,
                    ps.c.created_at.label("staffing_created_at"),
                    ps.c.updated_at.label("staffing_updated_at"),

                    # from projects
                    p.c.project_id,
                    p.c.project_name,
                    p.c.active_at,
                    p.c.status,
                    p.c.inactive_at,
                    p.c.created_at,
                    p.c.updated_at,

                    # from employees (optional)
                    e.c.first_name.label("employee_first_name"),
                    e.c.last_name.label("employee_last_name"),
                )
                .select_from(ps.join(p, ps.c.project_id == p.c.project_id)       # INNER (must have a project)
                  .outerjoin(e, e.c.employees_id == ps.c.employees_id)  # LEFT (employee may be missing)
                )
                .order_by(p.c.project_id.desc(), ps.c.id.asc())
                .limit(limit)
                .offset(offset)
                .where(p.c.status == '1' if is_active else True)
            )
            rows = await database.fetch_all(query)
            return [dict(r) for r in rows]
        except Exception as exc:
            raise HTTPException(status_code=400, detail=f"Failed to list projects with trainer details: {exc}")

    ## Find project and trainer by ID
    @staticmethod
    async def find_project_by_id(project_id: int, trainer_id: str) -> ProjectsWithTrainer:
        p, ps, e = projects.alias("p"), project_staffing.alias("ps"), employees.alias("e")
        stmt = (
            sqlalchemy.select(
                # project
                p.c.project_id, p.c.project_name, p.c.active_at, p.c.status,
                p.c.inactive_at, p.c.created_at, p.c.updated_at,
                # staffing
                ps.c.id.label("staffing_id"), ps.c.employees_id,
                ps.c.gms_manager, ps.c.t_manager, ps.c.pod_lead,
                ps.c.created_at.label("staffing_created_at"),
                ps.c.updated_at.label("staffing_updated_at"),
                # employee
                e.c.first_name.label("employee_first_name"), e.c.last_name.label("employee_last_name"), e.c.email.label("employee_email"),
            )
            .select_from(
                p.join(ps, ps.c.project_id == p.c.project_id)
                .outerjoin(e, e.c.employees_id == ps.c.employees_id)
            )
            .where(and_(p.c.project_id == project_id, ps.c.employees_id == trainer_id))
        )
        row = await database.fetch_one(stmt)
        if not row:
            # fallback: return project-only
            proj = await database.fetch_one(sqlalchemy.select(projects).where(projects.c.project_id == project_id))
            if not proj:
                raise HTTPException(status_code=404, detail=f"Project '{project_id}' not found")
            return dict(proj)
        return dict(row)
    


    # ## Projects register with trainer
    # @staticmethod
    # async def register_projects_with_trainer(project: ProjectsAdd) -> ProjectsWithTrainer:
    #     try:
    #         async with database.transactions():
    #             proj_values = {
    #                 "project_name": project.project_name,
    #             }
    #             # optional fields if provided
    #             if getattr(project, "active_at", None) is not None:
    #                 proj_values["active_at"] = project.active_at
    #             if getattr(project, "status", None) is not None:
    #                 proj_values["status"] = project.status
    #             if getattr(project, "inactive_at", None) is not None:
    #                 proj_values["inactive_at"] = project.inactive_at

    #             proj_ins = (

    #                 sqlalchemy.insert(projects)
    #                 .values(**proj_values)
    #                 .returning(*projects.c)
    #             )
    #             proj_row = await database.fetch_one(proj_ins)
    #             if not proj_row:
    #                 raise HTTPException(status_code=400, detail="Project create failed")

    #             result = dict(proj_row)

    #             trainer_id = getattr(project, "trainer_id", None)
    #             if trainer_id:
    #                 # map both names: accept t_manager OR legacy lead_name; same for pod_lead/pod_name
    #                 t_manager = getattr(project, "t_manager", None)
    #                 if t_manager is None:
    #                     t_manager = getattr(project, "lead_name", None)

    #                 pod_lead = getattr(project, "pod_lead", None)
    #                 if pod_lead is None:
    #                     pod_lead = getattr(project, "pod_name", None)

    #                 ps_ins = (
    #                     sqlalchemy.insert(project_staffing)
    #                     .values(
    #                         project_id=result["project_id"],
    #                         employees_id=trainer_id,
    #                         gms_manager=getattr(project, "gms_manager", None),
    #                         t_manager=t_manager,
    #                         pod_lead=pod_lead,
    #                     )
    #                     .returning(*project_staffing.c)
    #                 )
    #                 staff_row = await database.fetch_one(ps_ins)
    #                 # decorate the response to look like your “with trainer” shape
    #                 if staff_row:
    #                     staff_dict = dict(staff_row)
    #                     result.update({
    #                         "staffing_id": staff_dict["id"],
    #                         "employees_id": staff_dict["employees_id"],
    #                         "gms_manager": staff_dict["gms_manager"],
    #                         "t_manager": staff_dict["t_manager"],
    #                         "pod_lead": staff_dict["pod_lead"],
    #                     })

    #             if trainer_id:
    #                 e = employees.alias("e")
    #                 emp = await database.fetch_one(
    #                     sqlalchemy.select(e.c.first_name, e.c.last_name, e.c.email)
    #                       .where(e.c.employees_id == trainer_id)
    #                 )
    #                 if emp:
    #                     result["employee_first_name"] = emp["first_name"]
    #                     result["employee_last_name"]  = emp["last_name"]

    #             return result
    #     except HTTPException:
    #         raise
    #     except Exception:
    #         raise HTTPException(
    #             status_code=status.HTTP_400_BAD_REQUEST,
    #             detail="Failed to create project (and assign trainer)"
    #         )
    
    # ## Assign trainer to Project
    # @staticmethod
    # async def assign_trainer_project(trainer_assign: TrainerAssign) -> ProjectsWithTrainer:
    #     # Validate
    #     await ProjectsCurdOperation._ensure_project_exists(trainer_assign.project_id)
    #     await ProjectsCurdOperation._ensure_employee_exists(trainer_assign.employees_id)

    #     ps = project_staffing

    #     # Check if already assigned
    #     exists_q = sqlalchemy.select(ps.c.id).where(
    #         and_(ps.c.project_id == trainer_assign.project_id, ps.c.employees_id == trainer_assign.trainer_id)
    #     )
    #     existing = await database.fetch_one(exists_q)
    #     async with database.transaction():
    #         if existing:
    #             if not trainer_assign.upsert:
    #                 raise HTTPException(
    #                     status_code=status.HTTP_409_CONFLICT,
    #                     detail=f"Trainer '{trainer_assign.trainer_id}' is already assigned to project '{trainer_assign.project_id}'"
    #                 )
    #             # Update manager fields (only those provided)
    #             update_data = {
    #                 "gms_manager": trainer_assign.gms_manager,
    #                 "t_manager": trainer_assign.t_manager,
    #                 "pod_lead": trainer_assign.pod_lead,
    #             }
    #             update_data = {k: v for k, v in update_data.items() if v is not None}
    #             if update_data:
    #                 upd = (
    #                     sqlalchemy.update(ps)
    #                     .where(and_(ps.c.project_id == trainer_assign.project_id, ps.c.employees_id == trainer_assign.trainer_id))
    #                     .values(**update_data)
    #                 )
    #                 await database.execute(upd)
    #         else:
    #             # Insert new staffing row
    #             ins = (
    #                 sqlalchemy.insert(ps)
    #                 .values(
    #                     project_id=trainer_assign.project_id,
    #                     employees_id=trainer_assign.trainer_id,
    #                     gms_manager=trainer_assign.gms_manager,
    #                     t_manager=trainer_assign.t_manager,
    #                     pod_lead=trainer_assign.pod_lead,
    #                 )
    #             )
    #             await database.execute(ins)
        
    #     try:
    #         result = await ProjectsCurdOperation._fetch_project_with_staffing(trainer_assign.project_id, trainer_assign.trainer_id)
    #         if not result:
    #             # Fallback (shouldn't happen)
    #             proj = await database.fetch_one(sqlalchemy.select(projects).where(projects.c.project_id == trainer_assign.project_id))
    #             return dict(proj) if proj else {"project_id": trainer_assign.project_id, "employees_id": trainer_assign.trainer_id}
    #         return result
    #     except Exception:
    #         raise HTTPException(status_code=400, detail="Assigned, but failed to load result view")


    ## Add new project
    @staticmethod
    async def add_project(project: "ProjectsAdd") -> dict:
        values = {
            "project_name": project.project_name,
            "active_at": project.active_at or date.today(),
            "inactive_at": project.inactive_at,
            "status": project.status or "1",
            # created_at/updated_at handled by DB defaults/triggers
        }

        try:
            stmt = sqlalchemy.insert(projects).values(**values).returning(*projects.c)
            row = await database.fetch_one(stmt)
            if not row:
                raise HTTPException(status_code=400, detail="Project create failed")
            return dict(row)
        except HTTPException:
            raise
        except Exception as exc:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Failed to create project: {exc}",
            ) from exc
        
    ## Add project staffing
    @staticmethod
    async def add_project_staffing(staff: "ProjectStaffingAdd") -> dict:
        # validate FKs
        await ProjectsCurdOperation._ensure_project_exists(staff.project_id)
        await ProjectsCurdOperation._ensure_employee_exists(staff.employees_id)

        # prevent duplicate assignment
        if await ProjectsCurdOperation._staffing_exists(staff.project_id, staff.employees_id):
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"Employee '{staff.employees_id}' is already assigned to project '{staff.project_id}'",
            )

        values = {
            "project_id":  staff.project_id,
            "employees_id": staff.employees_id,
            "gms_manager":  staff.gms_manager,
            "t_manager":    staff.t_manager,
            "pod_lead":     staff.pod_lead,
        }

        try:
            stmt = sqlalchemy.insert(project_staffing).values(**values).returning(*project_staffing.c)
            row = await database.fetch_one(stmt)
            if not row:
                raise HTTPException(status_code=400, detail="Project staffing create failed")
            return dict(row)
        except HTTPException:
            raise
        except Exception as exc:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Failed to create project staffing: {exc}",
            ) from exc
    
    ## Add project with staffing
    @staticmethod
    async def add_project_with_staff(payload: "ProjectWithStaffingAdd") -> ProjectsWithTrainer:
        """
        Uses the ProjectWithStaffingAdd variant that includes project fields (via inheritance from ProjectsAdd)
        AND the trainer assignment fields.
        """
        async with database.transaction():
            # 3a. create project
            proj = await ProjectsCurdOperation.add_project(payload)  # reuses method #1
            project_id = proj["project_id"]

            # 3b. create staffing
            staff_input = type("Tmp", (), {})()   # minimal shim to reuse method #2
            staff_input.project_id  = project_id
            staff_input.employees_id = payload.employees_id
            staff_input.gms_manager  = getattr(payload, "gms_manager", None)
            staff_input.t_manager    = getattr(payload, "t_manager", None)
            staff_input.pod_lead     = getattr(payload, "pod_lead", None)

            print("Staff input:", staff_input)  # Debugging line

            staff = await ProjectsCurdOperation.add_project_staffing(staff_input)  # reuses method #2

            # (optional) include a couple of employee name fields for convenience
            emp = await database.fetch_one(
                sqlalchemy.select(employees.c.first_name, employees.c.last_name)
                .where(employees.c.employees_id == payload.employees_id)
            )

            result = {
                **proj,
                "staffing_id": staff["id"],
                "employees_id" : staff["employees_id"], 
                "gms_manager" : staff["gms_manager"],
                "t_manager" : staff["t_manager"],
                "pod_lead" : staff["pod_lead"],
                "staffing_created_at" : staff["created_at"],
                "staffing_updated_at" : staff["updated_at"]
            }
            
            if emp:
                result["employee_first_name"] = emp["first_name"]
                result["employee_last_name"] = emp["last_name"]

            return result
    
    ## Update projects and project staffing
    @staticmethod
    async def update_project(project_id: int, trainer_id: str, project: TrainerProjectUpdate) -> ProjectsWithTrainer:
        proj_update = {
            "project_name": project.project_name,
            "active_at": project.active_at,
            "inactive_at": project.inactive_at,
            "status": project.status,
        }
        proj_update = {k: v for k, v in proj_update.items() if v is not None}

        staff_update = {
            "gms_manager": project.gms_manager,
            "t_manager": project.t_manager,
            "pod_lead": project.pod_lead,
        }
        staff_update = {k: v for k, v in staff_update.items() if v is not None}

        # If nothing changed, just return current view
        if not proj_update and not staff_update:
            return await ProjectsCurdOperation.find_project_by_id(project_id, trainer_id)

        try:
            async with database.transaction():
                # Update projects
                if proj_update:
                    stmt = (
                        sqlalchemy.update(projects)
                        .where(projects.c.project_id == project_id)
                        .values(**proj_update)
                    )
                    await database.execute(stmt)

                # Update project_staffing (must exist; we checked)
                if staff_update:
                    stmt = (
                        sqlalchemy.update(project_staffing)
                        .where(and_(
                            project_staffing.c.project_id == project_id,
                            project_staffing.c.employees_id == trainer_id
                        ))
                        .values(**staff_update)
                    )
                    await database.execute(stmt)

            # Return a joined view (project + staffing + employee)
            return await ProjectsCurdOperation.find_project_by_id(project_id, trainer_id)

        except HTTPException:
            raise
        except Exception:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Failed to update project and staffing"
            )

    ## Delete project
    @staticmethod
    async def delete_project(project_id: int, trainer_id: str) -> Dict[str, Any]:
        ps = project_staffing
        p = projects
        row_exists_query = sqlalchemy.select(ps.c.id).where(
            and_(ps.c.project_id == project_id, ps.c.employees_id == trainer_id)
        )
        row_exists = await database.fetch_one(row_exists_query)
        if not row_exists:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"No staffing for project_id={project_id} with trainer_id='{trainer_id}'"
            )
        query = ps.delete().where(ps.c.project_id == project_id, ps.c.employees_id == trainer_id)
        await database.execute(query)
        return {"message": "Project ID deleted successfully"}
    
    ## Get Projects by Trainer Name
    @staticmethod
    async def get_projects_for_trainer(trainer_id: str, limit: int = default_limit, offset: int = default_offset, is_active: bool = False) -> List[Projects]:
        try:
            query = sqlalchemy.select(projects, 
                                      project_staffing.c.id.label("staffing_id"),
                                      project_staffing.c.employees_id,
                                      project_staffing.c.gms_manager,
                                      project_staffing.c.t_manager,
                                      project_staffing.c.pod_lead,
                                      project_staffing.c.created_at.label("staffing_created_at"),
                                      project_staffing.c.updated_at.label("staffing_updated_at")
                                      ).select_from(projects.join(project_staffing, project_staffing.c.project_id == projects.c.project_id)
                                                            ).where(project_staffing.c.employees_id == trainer_id).limit(limit).offset(offset).where(projects.c.status == '1' if is_active else True)
            res = await database.fetch_all(query)
            return res
        except Exception:
            raise HTTPException(status_code=400, detail="Failed to list projects for trainer")
