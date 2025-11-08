import uuid
from datetime import datetime, timezone
from typing import List, Dict, Any, Optional

from schema.users import UserEntry, UserList, UserLogin, UserUpdate
from pg_db import database, users
from fastapi import HTTPException
from passlib.context import CryptContext
from sqlalchemy import select

# Prefer bcrypt_sha256 first to avoid 72-byte truncation issues
pwd_context = CryptContext(
    schemes=["bcrypt_sha256", "bcrypt"],
    deprecated="auto",
    bcrypt__truncate_error=False,
)

class UserCurdOperation:
    # -------- All users --------
    @staticmethod
    async def find_all_users() -> List[Dict[str, Any]]:
        # Do NOT select password here
        query = select(
            users.c.id,
            users.c.username,
            users.c.first_name,
            users.c.last_name,
            users.c.gender,
            users.c.created_at,
            users.c.status,
        )
        rows = await database.fetch_all(query)
        return [dict(r) for r in rows]

    # -------- Register (Sign Up) --------
    @staticmethod
    async def register_user(user: UserEntry) -> Dict[str, Any]:
        g_id = str(uuid.uuid1())
        now = datetime.now(timezone.utc)

        #hashed = pwd_context.hash(user.password)

        ins = users.insert().values(
            id=g_id,
            username=user.username,
            password=user.password,          # store HASH, not plaintext
            first_name=user.first_name,
            last_name=user.last_name,
            gender=user.gender,
            created_at=now,
            updated_at=now,
            status="1",
        )
        await database.execute(ins)

        # Return what the response_model expects (no password)
        return {
            "id": g_id,
            "username": user.username,
            "first_name": user.first_name,
            "last_name": user.last_name,
            "gender": user.gender,
            "created_at": now,
            "status": "1",
        }

    # -------- Find by ID --------
    @staticmethod
    async def find_user_by_id(user_id: str) -> Optional[Dict[str, Any]]:
        query = select(
            users.c.id,
            users.c.username,
            users.c.first_name,
            users.c.last_name,
            users.c.gender,
            users.c.created_at,
            users.c.status,
        ).where(users.c.id == user_id)

        row = await database.fetch_one(query)
        return dict(row) if row else None

    # -------- Update --------
    @staticmethod
    async def update_user(user: UserUpdate) -> Dict[str, Any]:
        now = datetime.now(timezone.utc)

        upd = (
            users.update()
            .where(users.c.id == user.id)
            .values(
                first_name=user.first_name,
                last_name=user.last_name,
                gender=user.gender,
                status=user.status,
                updated_at=now,
            )
        )
        await database.execute(upd)

        updated = await UserCurdOperation.find_user_by_id(user.id)
        if not updated:
            raise HTTPException(status_code=404, detail="User not found")
        return updated

    # -------- Delete --------
    @staticmethod
    async def delete_user(user_id: str) -> Dict[str, Any]:
        exists = await UserCurdOperation.find_user_by_id(user_id)
        if not exists:
            raise HTTPException(status_code=404, detail="User not found")

        dele = users.delete().where(users.c.id == user_id)
        await database.execute(dele)
        return {"status": True, "message": "This user has been deleted successfully."}

    # -------- Login --------
    @staticmethod
    async def login(user: UserLogin) -> Dict[str, Any]:
        # fetch one user by username (include password only for verification)
        query = select(
            users.c.id,
            users.c.username,
            users.c.password,
            users.c.status,
        ).where(users.c.username == user.username)

        db_user = await database.fetch_one(query)
        if not db_user:
            raise HTTPException(status_code=401, detail="Invalid username or password")

        if not user.password == db_user['password']:
            raise HTTPException(status_code=401, detail="Invalid username or password")

        return {"status": True, "message": "Login successful", "user_id": db_user["id"]}