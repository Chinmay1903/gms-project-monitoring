from fastapi import APIRouter, HTTPException, status
from typing import List
import logging

from schema.users import UserList, UserEntry, UserUpdate, UserLogin
from curd.users import UserCurdOperation

router = APIRouter(prefix="/users", tags=["Users"])
logger = logging.getLogger(__name__)

# Get all users
@router.get("", response_model=List[UserList])
async def find_all_users():
    try:
        return await UserCurdOperation.find_all_users()
    except HTTPException as he:
        logger.warning("find_all_users HTTPException: %s", he.detail)
        raise
    except Exception as exc:
        logger.exception("Failed to list users")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to list users: {exc}"
        ) from exc

# Register user
@router.post("", response_model=UserList)
async def register_user(user: UserEntry):
    try:
        return await UserCurdOperation.register_user(user)
    except HTTPException as he:
        logger.warning("register_user HTTPException: %s", he.detail)
        raise
    except Exception as exc:
        logger.exception("Failed to register user")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to register user: {exc}"
        ) from exc

# Get user by ID
@router.get("/{userId}", response_model=UserList)
async def find_user_by_id(userId: str):
    try:
        user = await UserCurdOperation.find_user_by_id(userId)
        if not user:
            raise HTTPException(status_code=404, detail=f"User '{userId}' not found")
        return user  # your CRUD should already return a dict compatible with UserList
    except HTTPException as he:
        logger.warning("find_user_by_id HTTPException: %s", he.detail)
        raise
    except Exception as exc:
        logger.exception("Failed to fetch user by id")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch user '{userId}': {exc}"
        ) from exc

# Update user
@router.put("/{userId}", response_model=UserList)
async def update_user(userId: str, user: UserUpdate):
    try:
        # pass the path id explicitly; avoid mutating the Pydantic model shape
        updated = await UserCurdOperation.update_user(userId, user)
        if not updated:
            raise HTTPException(status_code=404, detail=f"User '{userId}' not found")
        return updated
    except HTTPException as he:
        logger.warning("update_user HTTPException: %s", he.detail)
        raise
    except Exception as exc:
        logger.exception("Failed to update user")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to update user '{userId}': {exc}"
        ) from exc

# Delete user
@router.delete("/{userId}")
async def delete_user(userId: str):
    try:
        result = await UserCurdOperation.delete_user(userId)
        return result
    except HTTPException as he:
        logger.warning("delete_user HTTPException: %s", he.detail)
        raise
    except Exception as exc:
        logger.exception("Failed to delete user")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to delete user '{userId}': {exc}"
        ) from exc

# Login
@router.post("/login")
async def login(user: UserLogin):
    try:
        result = await UserCurdOperation.login(user)
        if not result:
            # let CRUD also raise 401 if it prefers; this is a fallback
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid username or password",
                headers={"WWW-Authenticate": "Bearer"},
            )
        # return whatever your CRUD returns (token/claims), or a simple message
        return result if isinstance(result, dict) else {"message": "Login successful"}
    except HTTPException as he:
        logger.warning("login HTTPException: %s", he.detail)
        raise
    except Exception as exc:
        logger.exception("Login failed")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Internal server error during login: {exc}"
        ) from exc
