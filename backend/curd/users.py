import datetime, uuid
from schema.users import UserEntry,UserList,UserLogin,UserUpdate
from pg_db import database,users
from sqlalchemy import select, insert
from fastapi import HTTPException, status
from passlib.context import CryptContext

 
# pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

## End Point for User table

## All User
class UserCurdOperation:

    ## All users
    @staticmethod
    async def find_all_users():
        query = users.select()
        return await database.fetch_all(query)

    ## Sign Up user
    @staticmethod
    async def register_user(user: UserEntry):
        gID   = str(uuid.uuid1())
        # optional: check uniqueness first (email/username)
        exists = await database.fetch_one(
            select(users.c.username).where(users.c.username == user.username)
        )
        if exists:
            raise HTTPException(status_code=409, detail="Email already exists")

        stmt = (
            insert(users)
            .values(
                id = gID,
                username=user.username,
                password=pwd_context.hash(user.password),
                first_name=user.first_name,
                last_name=user.last_name,
                gender=user.gender,
            )
            .returning(*users.c)   # <- put RETURNING on the statement
        )
        try:
            row = await database.fetch_one(stmt)  # <- fetch_one for RETURNING
            if not row:
                raise HTTPException(status_code=400, detail="User insert failed")
            return dict(row)
        except HTTPException:
            raise
        except Exception as exc:
            # If this is a UNIQUE/FK error, you can parse str(exc) and map to 409, etc.
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Failed to register user: {exc}",
            ) from exc

    ## Find User bu ID
    @staticmethod
    async def find_user_by_id(userId: str):
        query = users.select().where(users.c.id == userId)
        user = await database.fetch_one(query)
        if not user:
           raise HTTPException(status_code=404, detail="User not found")
        return dict(user)

    ## Update user
    @staticmethod
    async def update_user(user_id: str, user: UserUpdate):
        query = users.update().where(users.c.id == user_id).values(
            first_name=user.first_name,
            last_name=user.last_name,
            gender=user.gender,
            status=user.status,
        )
        await database.execute(query)
        # return updated user as dict for FastAPI
        updated_user = await UserCurdOperation.find_user_by_id(user_id)
        return dict(updated_user)

        #return await find_user_by_id(user.id)

    ## Delete user
    @staticmethod
    async def delete_user(userId: str):
        query = users.delete().where(users.c.id == userId)
        await database.execute(query)
        return {
            "status": True,
            "message": "This user has been deleted successfully."
        }

    ##LOGIN
    @staticmethod
    async def login(user: UserLogin):
        query = users.select().where(users.c.username == user.username)
        db_user = await database.fetch_one(query)

        if not db_user or not pwd_context.verify(user.password, db_user["password"]):
            raise HTTPException(status_code=401, detail="Invalid username or password")
        
        return {"status": True,"message": "Login successful"}



