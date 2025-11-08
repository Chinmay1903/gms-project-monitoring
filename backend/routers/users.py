from typing import List
from fastapi import APIRouter, HTTPException
from schema.users import UserList, UserEntry, UserUpdate, UserLogin
from curd.users import UserCurdOperation

router = APIRouter(prefix="/users", tags=["Users"])

# GET /users
@router.get("/", response_model=List[UserList])
async def find_all_users():
    return await UserCurdOperation.find_all_users()

# POST /users
@router.post("/", response_model=UserList)
async def register_user(user: UserEntry):
    return await UserCurdOperation.register_user(user)

# GET /users/{user_id}
@router.get("/{user_id}", response_model=UserList)
async def find_user_by_id(user_id: str):
    user = await UserCurdOperation.find_user_by_id(user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user

# PUT /users/{user_id}
@router.put("/{user_id}", response_model=UserList)
async def update_user(user_id: str, user: UserUpdate):
    user.id = user_id  # bind path param to body
    return await UserCurdOperation.update_user(user)

# DELETE /users/{user_id}
@router.delete("/{user_id}")
async def delete_user(user_id: str):
    return await UserCurdOperation.delete_user(user_id)

# POST /users/login
@router.post("/login")
async def login(user: UserLogin):
    return await UserCurdOperation.login(user)