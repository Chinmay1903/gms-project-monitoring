from __future__ import annotations
import datetime, uuid
from typing import Dict, Any, List, Optional
from schema.roles import RolesEntry,RolesUpdate, RolesList
from pg_db import database,roles
from sqlalchemy import select, insert, update, delete
from fastapi import HTTPException, status


## End Point for Roles Table

class RolesCurdOperation:

    # ───────────────────────── helpers ─────────────────────────

    @staticmethod
    async def _ensure_role_exists(role_id: str) -> Dict[str, Any]:
        row = await database.fetch_one(select(roles).where(roles.c.role_id == role_id))
        if not row:
            raise HTTPException(status_code=404, detail=f"Role '{role_id}' not found")
        return dict(row)

    @staticmethod
    async def _role_name_exists(role_name: str, exclude_role_id: Optional[str] = None) -> bool:
        q = select(roles.c.role_id).where(roles.c.role_name == role_name)
        if exclude_role_id:
            q = q.where(roles.c.role_id != exclude_role_id)
        return (await database.fetch_one(q)) is not None
    
    @staticmethod
    def _to_roles_list_dict(row: Dict[str, Any]) -> Dict[str, Any]:
        """
        Normalize DB row → RolesList shape.
        Supports either `create_at/updated_at` or `created_at/updated_at` column names.
        """
        d = dict(row)
        # tolerate either naming; prefer schema field names
        create_at = d.get("create_at") or d.get("created_at")
        updated_at = d.get("updated_at") or d.get("updated_at")  # keep as-is if already there

        # If DB doesn’t auto-manage updated_at, at least echo create_at
        if not updated_at:
            updated_at = create_at

        return {
            "role_id": d["role_id"],
            "role_name": d["role_name"],
            "create_at": str(create_at) if create_at is not None else "",
            "updated_at": str(updated_at) if updated_at is not None else "",
        }

    # ───────────────────────── list ─────────────────────────

    @staticmethod
    async def find_all_roles() -> List[RolesList]:
        try:
            rows = await database.fetch_all(select(roles).order_by(roles.c.role_name.asc()))
            return [RolesCurdOperation._to_roles_list_dict(dict(r)) for r in rows]
        except Exception:
            raise HTTPException(status_code=400, detail="Failed to list roles")

    # ───────────────────────── create ─────────────────────────

    @staticmethod
    async def register_role(role: RolesEntry) -> RolesList:
        # prevent duplicate names
        if await RolesCurdOperation._role_name_exists(role.role_name):
            raise HTTPException(status_code=409, detail="Role name already exists")

        new_role_id = str(uuid.uuid4())

        try:
            # If your table has server defaults for create_at/updated_at, you can omit them.
            stmt = (
                insert(roles)
                .values(
                    role_id=new_role_id,
                    role_name=role.role_name
                )
            )
            await database.execute(stmt)

            stored = await database.fetch_one(select(roles).where(roles.c.role_id == new_role_id))
            if not stored:
                raise HTTPException(status_code=400, detail="Failed to fetch newly created role")

            return RolesCurdOperation._to_roles_list_dict(dict(stored))

        except HTTPException:
            raise
        except Exception:
            raise HTTPException(status_code=400, detail="Failed to create role")

    # ───────────────────────── update ─────────────────────────

    @staticmethod
    async def update_role(role_id: str, role: RolesUpdate) -> RolesList:
        # ensure it exists
        await RolesCurdOperation._ensure_role_exists(role_id)

        # prevent duplicate name (excluding current role)
        if await RolesCurdOperation._role_name_exists(role.role_name, exclude_role_id=role_id):
            raise HTTPException(status_code=409, detail="Role name already exists")

        try:
            stmt = (
                update(roles)
                .where(roles.c.role_id == role_id)
                .values(
                    role_name=role.role_name
                )
            )
            await database.execute(stmt)

            updated = await database.fetch_one(select(roles).where(roles.c.role_id == role_id))
            if not updated:
                raise HTTPException(status_code=404, detail="Role not found after update")

            return RolesCurdOperation._to_roles_list_dict(dict(updated))

        except HTTPException:
            raise
        except Exception:
            raise HTTPException(status_code=400, detail="Failed to update role")

    # ───────────────────────── delete ─────────────────────────

    @staticmethod
    async def delete_role(role_id: str) -> Dict[str, Any]:
        await RolesCurdOperation._ensure_role_exists(role_id)

        try:
            stmt = delete(roles).where(roles.c.role_id == role_id)
            await database.execute(stmt)
            return {"message": "Role deleted successfully", "role_id": role_id}
        except Exception:
            # Likely FK violation if employees reference this role
            raise HTTPException(
                status_code=400,
                detail="Cannot delete role because it is referenced by other records",
            )
        