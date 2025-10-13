import datetime, uuid
from schema.roles import RolesEntry,RolesUpdate
from pg_db import database,roles


## End Point for Roles Table

class RolesCurdOperation:

    ## All roles
    @staticmethod
    async def find_all_roles():
        query = roles.select()
        return await database.fetch_all(query)
    
    ## Roles register
    @staticmethod
    async def register_role(role: RolesEntry):
        gDate = str(datetime.datetime.now())
        new_role_id = str(uuid.uuid4())   # generate once, reuse

        query = roles.insert().values(
            role_id=new_role_id,
            role_name=role.role_name,
            create_at=gDate
        )
        await database.execute(query)

        # ✅ include role_id in the response
        return {
            "role_id": new_role_id,
            "role_name": role.role_name,
            "create_at": gDate
        }

    
    ## Update roles
    @staticmethod
    async def update_role(role_id: str, role: RolesUpdate):
        # Update record
        query = roles.update().where(roles.c.role_id == role_id).values(
            role_name=role.role_name
        )
        await database.execute(query)

        # ✅ Fetch the updated record
        select_query = roles.select().where(roles.c.role_id == role_id)
        updated_role = await database.fetch_one(select_query)

        return {
            "role_id": updated_role["role_id"],
            "role_name": updated_role["role_name"],
            "create_at": updated_role["create_at"]
        }

    
    ## Delete roles
    @staticmethod
    async def delete_role(role_id: str):
        query = roles.delete().where(roles.c.role_id == role_id)
        await database.execute(query)
        return {"message": "Role deleted successfully"}
