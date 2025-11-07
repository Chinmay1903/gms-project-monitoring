from pydantic import BaseModel, Field

## Models for Roles Table
class RolesList(BaseModel):
    role_id   : str = Field(..., description = "Role Id")
    role_name : str = Field(..., description = "Role Name")
    create_at : str = Field(..., description = "Timestamp when the employee record was created")
    updated_at: str = Field(..., description = "Timestamp when the employee record was last updated")
class RolesEntry(BaseModel):
    role_name : str = Field(..., description="Role Name")
class RolesUpdate(BaseModel):
    role_name : str = Field(..., description="Role Name")
