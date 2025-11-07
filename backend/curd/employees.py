from __future__ import annotations
from fastapi import HTTPException, status
import sqlalchemy as sa
from sqlalchemy import select, insert, update, delete
from schema.employees import EmployeesEntry,EmployeesUpdate, EmployeesList
from pg_db import database,employees, roles
from passlib.context import CryptContext
from typing import List, Dict, Any, Optional
from datetime import date

 
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


## End Point for Employees Table

class EmployeesCurdOperation:

    # ───────────────────────── helpers ─────────────────────────

    @staticmethod
    async def _ensure_employee_exists(employees_id: str) -> Dict[str, Any]:
        row = await database.fetch_one(
            select(employees).where(employees.c.employees_id == employees_id)
        )
        if not row:
            return None
        return dict(row)

    @staticmethod
    async def _email_exists(email: str, exclude_emp_id: Optional[str] = None) -> bool:
        q = select(employees.c.employees_id).where(employees.c.email == email)
        if exclude_emp_id:
            q = q.where(employees.c.employees_id != exclude_emp_id)
        return (await database.fetch_one(q)) is not None

    @staticmethod
    def _row_to_employees_list(row: sa.engine.Row | Dict[str, Any]) -> Dict[str, Any]:
        """Normalize a joined row → EmployeesList shape."""
        d = dict(row)

        # map role_name if present; LEFT JOIN may yield None
        role_name = d.get("role_name")

        # Some DBs use created_at/updated_at names; your schema expects created_at/updated_at.
        created_at = d.get("created_at") or d.get("create_at")
        updated_at = d.get("updated_at")

        return {
            "employees_id": d["employees_id"],
            "first_name": d["first_name"],
            "last_name": d.get("last_name"),
            "email": d["email"],
            "phone": d.get("phone"),
            "gender": d.get("gender"),
            "designation": d.get("designation"),
            "role": d.get("role"),
            "role_name": role_name,
            "skill": d.get("skill"),
            "experience": d.get("experience"),
            "qualification": d.get("qualification"),
            "state": d.get("state"),
            "city": d.get("city"),
            "active_at": d["active_at"],                 # NOT NULL in your model
            "inactive_at": d.get("inactive_at"),
            "status": d["status"],                       # '0' | '1'
            "created_at": created_at,
            "updated_at": updated_at,
        }

    # ───────────────────────── list ─────────────────────────

    @staticmethod
    async def find_all_employees(
        *,
        q: Optional[str] = None,
        status_flag: Optional[str] = None,   # '1' or '0'
        limit: int = 50,
        offset: int = 0,
    ) -> List[EmployeesList]:
        """List employees with optional search & status filter, including role_name."""
        e, r = employees.alias("e"), roles.alias("r")

        stmt = (
            select(
                e.c.employees_id, e.c.first_name, e.c.last_name, e.c.email, e.c.phone, e.c.gender,
                e.c.designation, e.c.role, e.c.skill, e.c.experience, e.c.qualification,
                e.c.state, e.c.city, e.c.active_at, e.c.inactive_at, e.c.status,
                e.c.created_at, e.c.updated_at,
                r.c.role_name,
            )
            .select_from(e.outerjoin(r, r.c.role_id == e.c.role))
            .order_by(e.c.created_at.desc())
            .limit(limit)
            .offset(offset)
        )

        if q:
            like = f"%{q}%"
            stmt = stmt.where(
                sa.or_(
                    e.c.first_name.ilike(like),
                    e.c.last_name.ilike(like),
                    e.c.email.ilike(like),
                )
            )
        if status_flag in ("0", "1"):
            stmt = stmt.where(e.c.status == status_flag)

        try:
            rows = await database.fetch_all(stmt)
            return [EmployeesCurdOperation._row_to_employees_list(r) for r in rows]
        except Exception:
            raise HTTPException(status_code=400, detail="Failed to list employees")

    # ───────────────────────── basic name list (optional) ─────────────────────────
    # If you keep this endpoint, it returns a simplified shape (not EmployeesList).
    @staticmethod
    async def find_all_employees_name( active_only: bool = True
    ) -> List[Dict[str, Any]]:
        e, r = employees.alias("e"), roles.alias("r")
        stmt = (
            select(
                e.c.employees_id,
                e.c.first_name,
                e.c.last_name,
                r.c.role_name,
            )
            .select_from(e.outerjoin(r, r.c.role_id == e.c.role))
        )
        if active_only:
            stmt = stmt.where(e.c.status == sa.literal("1"))
        try:
            rows = await database.fetch_all(stmt)
            return [
                {
                    "employees_id": row["employees_id"],
                    "full_name": row["first_name"]+" "+row["last_name"],
                    "role_name": row["role_name"],
                }
                for row in rows
            ]
        except Exception:
            raise HTTPException(status_code=400, detail="Failed to list employee names")
        
    # ───────────────────────── get by id ─────────────────────────

    @staticmethod
    async def find_employees_by_id(employees_id: str) -> EmployeesList:
        e, r = employees.alias("e"), roles.alias("r")
        stmt = (
            select(
                e.c.employees_id, e.c.first_name, e.c.last_name, e.c.email, e.c.phone, e.c.gender,
                e.c.designation, e.c.role, e.c.skill, e.c.experience, e.c.qualification,
                e.c.state, e.c.city, e.c.active_at, e.c.inactive_at, e.c.status,
                e.c.created_at, e.c.updated_at,
                r.c.role_name,
            )
            .select_from(e.outerjoin(r, r.c.role_id == e.c.role))
            .where(e.c.employees_id == employees_id)
        )
        try:
            row = await database.fetch_one(stmt)
            if not row:
                raise HTTPException(status_code=404, detail=f"Employee '{employees_id}' not found")
            return EmployeesCurdOperation._row_to_employees_list(row)
        except HTTPException:
            raise
        except Exception:
            raise HTTPException(status_code=400, detail="Failed to fetch employee")

    # ───────────────────────── create ─────────────────────────

    @staticmethod
    async def register_employee(employee: EmployeesEntry) -> EmployeesList:
        # enforce unique email (also add UNIQUE index in DB, which you have)
        if await EmployeesCurdOperation._email_exists(employee.email):
            raise HTTPException(status_code=409, detail="Email already exists")
        
        if await EmployeesCurdOperation._ensure_employee_exists(employee.employees_id):
            raise HTTPException(status_code=409, detail="Employee ID already exists")

        if employee.employees_id:
            # If role is provided, let DB FK enforce validity. (Optionally pre-check)
            values = {
                "employees_id": employee.employees_id,
                "first_name": employee.first_name,
                "last_name": employee.last_name,
                "email": employee.email,
                "phone": employee.phone,
                "gender": employee.gender,
                "designation": employee.designation,
                "role": employee.role,
                "skill": employee.skill,
                "experience": employee.experience,
                "qualification": employee.qualification,
                "state": employee.state,
                "city": employee.city,
                "active_at": employee.active_at or date.today(),
                "status": employee.status or "1",
                # created_at/updated_at should be DB defaults/triggers; avoid setting explicitly
            }
            print(values)
            try:
                ins = insert(employees).values(**values).returning(*employees.c)
                inserted = await database.execute(ins)
                if not inserted:
                    raise HTTPException(status_code=400, detail="Insert failed")
                
                # Return full row (joined)
                return await EmployeesCurdOperation.find_employees_by_id(employee.employees_id)
            except HTTPException:
                raise
            except Exception:
                # Could be FK violation for role, etc.
                raise HTTPException(status_code=400, detail="Failed to create employee")
        else:
            raise HTTPException(status_code=404, detail="Employee ID is required")


    # ───────────────────────── update ─────────────────────────

    @staticmethod
    async def update_employees(employees_id: str, employee: "EmployeesUpdate") -> EmployeesList:
        # Ensure exists for nicer 404
        await EmployeesCurdOperation._ensure_employee_exists(employees_id)

        # Email uniqueness (if changed)
        if employee.email and await EmployeesCurdOperation._email_exists(employee.email, exclude_emp_id=employees_id):
            raise HTTPException(status_code=409, detail="Email already exists")

        # Build update dict; ignore None to allow partial-like update with this model
        data = {k: v for k, v in employee.dict(exclude_unset=True).items() if v is not None}

        # Map schema field names directly to columns.
        # DO NOT touch created_at here; rely on DB trigger to bump updated_at, or set it explicitly:
        # data["updated_at"] = sa.func.now()  # if you don't have triggers
        if not data:
            # Nothing changed; return current row
            return await EmployeesCurdOperation.find_employees_by_id(employees_id)

        try:
            stmt = (
                update(employees)
                .where(employees.c.employees_id == employees_id)
                .values(**data)
            )
            await database.execute(stmt)
            return await EmployeesCurdOperation.find_employees_by_id(employees_id)
        except HTTPException:
            raise
        except Exception:
            raise HTTPException(status_code=400, detail="Failed to update employee")

    # ───────────────────────── delete ─────────────────────────

    @staticmethod
    async def delete_employee(employees_id: str) -> Dict[str, Any]:
        # Ensure exists
        await EmployeesCurdOperation._ensure_employee_exists(employees_id)

        try:
            # If you have ON DELETE CASCADE from project_staffing/task_monitors → employees,
            # this will cascade cleanly; otherwise you may get FK errors.
            stmt = delete(employees).where(employees.c.employees_id == employees_id)
            await database.execute(stmt)
            return {"status": True, "message": "Employee has been deleted successfully.", "employees_id": employees_id}
        except Exception:
            raise HTTPException(
                status_code=400,
                detail="Cannot delete employee because it is referenced by other records",
            )
    