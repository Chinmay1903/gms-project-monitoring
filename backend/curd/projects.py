import datetime, uuid
import sqlalchemy
from schema.projects import ProjectsEntry,ProjectsDelete,ProjectsUpdate
from pg_db import database,projects


## End Point for Projects Table

class ProjectsCurdOperation:

    ## All projects
    @staticmethod
    async def find_all_projects():
        query = projects.select()
        return await database.fetch_all(query)
    
    ## Projects register
    @staticmethod
    async def register_projects(project: ProjectsEntry):
        gDate = str(datetime.datetime.now())
        new_project_id = str(uuid.uuid4())   # generate once, reuse

        query = projects.insert().values(
            #project_id=new_project_id,
            project_name=project.project_name,
            gms_manager=project.gms_manager,
            lead_name=project.lead_name,
            pod_name=project.pod_name,
            trainer_name=project.trainer_name,
            create_at=gDate
        )
        row = await database.execute(query)
        print(row)

        # ✅ include role_id in the response
        return {
            **project.dict(),
            "project_id": row,
            "create_at": gDate,
            "status": project.status,
            "inactive_at": project.inactive_at
        }
    ## Find project by ID
    @staticmethod
    async def find_project_by_id(project_id: int):
        query = projects.select().where(projects.c.project_id == project_id)
        return await database.fetch_one(query)
    
    ## Update projects
    @staticmethod
    async def update_project(project_id: int, project: ProjectsUpdate):
        query = (
            projects.update()
            .where(projects.c.project_id == project_id)
            .values(**{k: v for k, v in project.dict().items() if v is not None})
        )
        await database.execute(query)
        updated_project = await ProjectsCurdOperation.find_project_by_id(project_id)
        return dict(updated_project) if updated_project else {"message": "Project not found"}

    
    ## Delete roles
    @staticmethod
    async def delete_project(project: ProjectsDelete):
        query = projects.delete().where(projects.c.project_id == project.project_id)
        await database.execute(query)
        return {"message": "Project ID deleted successfully"}
    
    ## Get Projects by Trainer Name
    @staticmethod
    async def get_projects_by_trainer(trainer_name: str):
        query = sqlalchemy.select(projects.c).where(projects.c.trainer_name == trainer_name)
        res = await database.fetch_all(query)
        for row in res:
            print(dict(row))
        return res
