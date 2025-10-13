import datetime, uuid
from schema.users import UserEntry,UserList,UserLogin,UserUpdate
from pg_db import database,users
from fastapi import HTTPException
from passlib.context import CryptContext
 
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
        gDate =str(datetime.datetime.now())
        query = users.insert().values(
            id = gID,
            username   = user.username,
            password   = pwd_context.hash(user.password),
            first_name = user.first_name,
            last_name  = user.last_name,
            gender     = user.gender,
            create_at  = gDate,
            status     = user.status,
        ) 

        await database.execute(query)
        return {
            "id": gID,
            **user.dict(),
            "create_at":gDate,
            "status": "1"
        }

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
    async def update_user(user: UserUpdate):
        gDate = str(datetime.datetime.now())
        query = users.update().where(users.c.id == user.id).values(
            first_name=user.first_name,
            last_name=user.last_name,
            gender=user.gender,
            status=user.status,
            create_at=gDate,
        )
        await database.execute(query)
        # return updated user as dict for FastAPI
        updated_user = await UserCurdOperation.find_user_by_id(user.id)
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

###LOGIN
    @staticmethod
    async def login(user: UserLogin):
        query = users.select().where(users.c.username == user.username)
        db_user = await database.fetch_one(query)

        if not db_user or not pwd_context.verify(user.password, db_user["password"]):
            raise HTTPException(status_code=401, detail="Invalid username or password")
        
        return {"status": True,"message": "Login successful"}



