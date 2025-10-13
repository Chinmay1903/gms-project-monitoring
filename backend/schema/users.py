from pydantic import BaseModel, Field

## Models for User Table
class UserList(BaseModel):
    id        : str
    username  : str
    password  : str
    first_name: str
    last_name : str
    gender    : str
    create_at : str
    status    : str
class UserEntry(BaseModel):
    username  : str = Field(..., example="potinejj")
    password  : str = Field(..., example="potinejj")
    first_name: str = Field(..., example="Potine")
    last_name : str = Field(..., example="Sambo")
    gender    : str = Field(..., example="M")
    status    : str = Field(..., example="1 or 0")
class UserUpdate(BaseModel):
    id        : str = Field(..., example="Enter your id")
    first_name: str = Field(..., example="Potine")
    last_name : str = Field(..., example="Sambo")
    gender    : str = Field(..., example="M")
    status    : str = Field(..., example="1")


class UserLogin(BaseModel):
    username  : str
    password  : str


