from datetime import datetime
from pydantic import BaseModel, Field

# What we return in list/get responses (NO password)
class UserList(BaseModel):
    id: str
    username: str
    first_name: str
    last_name: str
    gender: str
    created_at: datetime
    status: str

class UserEntry(BaseModel):
    username: str = Field(..., example="potinejj")
    password: str = Field(..., example="S3cureP@ss")
    first_name: str = Field(..., example="Potine")
    last_name: str = Field(..., example="Sambo")
    gender: str = Field(..., example="M")

class UserUpdate(BaseModel):
    id: str = Field(..., example="enter-your-id")
    first_name: str
    last_name: str
    gender: str
    status: str = Field(..., example="1")

class UserDelete(BaseModel):
    id: str = Field(..., example="enter-your-id")

class UserLogin(BaseModel):
    username: str
    password: str