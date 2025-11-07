from fastapi import APIRouter, HTTPException, status
import logging
from schema.roles import RolesList, RolesUpdate, RolesEntry
from curd.roles import RolesCurdOperation
from typing import List

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/roles", tags=["Roles"])

# Get all roles
@router.get("", response_model=List[RolesList])
async def find_all_roles():
    try:
        return await RolesCurdOperation.find_all_roles()
    except HTTPException as he:
        # Already a clean API error from CRUD; keep it
        logger.warning("find_all_roles HTTPException: %s", he.detail)
        raise
    except Exception as exc:
        logger.exception("Failed to list roles")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={"message": "Failed to list roles", "error": str(exc)},
        )

# Register role
@router.post("", response_model=RolesList)
async def register_role(role: RolesEntry):
    try:
        return await RolesCurdOperation.register_role(role)
    except HTTPException as he:
        logger.warning("register_role HTTPException: %s", he.detail)
        raise
    except Exception as exc:
        logger.exception("Failed to create role")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={"message": "Failed to create role", "error": str(exc)},
        )

# Update role
@router.put("/{roleId}", response_model=RolesList)
async def update_role(roleId: str, role: RolesUpdate):
    try:
        return await RolesCurdOperation.update_role(roleId, role)
    except HTTPException as he:
        logger.warning("update_role HTTPException (roleId=%s): %s", roleId, he.detail)
        raise
    except Exception as exc:
        logger.exception("Failed to update role (roleId=%s)", roleId)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={"message": f"Failed to update role '{roleId}'", "error": str(exc)},
        )

# Delete role
@router.delete("/{roleId}")
async def delete_role(roleId: str):
    try:
        return await RolesCurdOperation.delete_role(roleId)
    except HTTPException as he:
        logger.warning("delete_role HTTPException (roleId=%s): %s", roleId, he.detail)
        raise
    except Exception as exc:
        logger.exception("Failed to delete role (roleId=%s)", roleId)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={"message": f"Failed to delete role '{roleId}'", "error": str(exc)},
        )
    