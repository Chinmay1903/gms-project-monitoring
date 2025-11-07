from fastapi import APIRouter, HTTPException
from typing import List
from schema.users import UserList, UserEntry, UserUpdate, UserLogin
from curd.users import UserCurdOperation

router = APIRouter(prefix="/users", tags=["Users"])

# Get all users
@router.get("", response_model=List[UserList], tags=["Users"])
async def find_all_users():
    return await UserCurdOperation.find_all_users()

# Register user
@router.post("", response_model=UserList, tags=["Users"])
async def register_user(user: UserEntry):
    return await UserCurdOperation.register_user(user)

# Get user by ID
@router.get("/{userId}", response_model=UserList, tags=["Users"])
async def find_user_by_id(userId: str):
    user= await UserCurdOperation.find_user_by_id(userId)
    return dict(user)

# Update user
@router.put("/{userId}", response_model=UserList, tags=["Users"])
async def update_user(userId: str, user: UserUpdate):
    user.id = userId  # assign path param to body
    return await UserCurdOperation.update_user(userId, user)

# Delete user
@router.delete("/{userId}", tags=["Users"])
async def delete_user(userId: str):
    return await UserCurdOperation.delete_user(userId)

# Login
# @app.post("/login", tags=["Users"])
# async def login(user: UserLogin):
#     return await UserCurdOperation.login(user)
@router.post("/login", tags=["Users"])
async def login(user: UserLogin):
    try:
        result = await UserCurdOperation.login(user)
        print("Login result:", result)  # 👈 Debug output

        if not result:
            raise HTTPException(
                status_code=401,
                detail="Invalid username or password",
                headers={"WWW-Authenticate": "Bearer"},
            )

        return {"message": "Login successful"}

    except HTTPException as http_exc:
        raise http_exc
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")
