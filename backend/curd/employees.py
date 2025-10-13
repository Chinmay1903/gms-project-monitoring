import datetime, uuid
import sqlalchemy
from schema.employees import EmployeesEntry,EmployeesUpdate
from pg_db import database,employees, roles
from passlib.context import CryptContext
 
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


## End Point for Employees Table

class EmployeesCurdOperation:

    ## All employees
    @staticmethod
    async def find_all_employees():
        query = sqlalchemy.select(
            employees,
            roles.c.role_name
        ).join(
            roles,
            employees.c.role == roles.c.role_id
        )

        result = await database.fetch_all(query)
    
        # Convert to list of dictionaries with role_name included
        return [
            {
                **dict(row),
                "role_name": row["role_name"],  # Add role_name to response
            }
            for row in result
        ]
    
    ## All employees with ID, Name, Role
    @staticmethod
    async def find_all_employees_name():
        query = (
            sqlalchemy.select(
                employees.c.employees_id,
                employees.c.first_name,
                employees.c.last_name,
                roles.c.role_name
            )
            .join(roles, employees.c.role == roles.c.role_id)
            .where(employees.c.status == '1')
        )
        result = await database.fetch_all(query)
        return [
            {
                "employees_id": row["employees_id"],
                "full_name": f"{row['first_name']} {row['last_name']}",
                "role_name": row["role_name"],
            }
            for row in result
        ]

    ## Employees register
    @staticmethod
    async def register_employee(employee: EmployeesEntry):
        gDate =str(datetime.datetime.now())
        query = employees.insert().values(
            employees_id   =    employee.employees_id,
            first_name     =     employee.first_name,
            last_name      =     employee.last_name,
            email          =     employee.email,
            phone          =     employee.phone,
            gender         =     employee.gender,
            designation    =     employee.designation,
            role           =     employee.role,
            skill          =     employee.skill,        
            experience     =     employee.experience,         
            qualification  =     employee.qualification,     
            state          =     employee.state, 
            city           =     employee.city,
            create_at      =     gDate,
            inactive_at    =     None,
            status         =     "1"
        ) 

        await database.execute(query)
        return await EmployeesCurdOperation.find_employees_by_id(employee.employees_id)
    
    ## Find Employees by ID
    @staticmethod
    async def find_employees_by_id(employees_id: str):
        query = (
            sqlalchemy.select(
                employees,
                roles.c.role_name
            )
            .join(
                roles,
                employees.c.role == roles.c.role_id
            )
            .where(employees.c.employees_id == employees_id)
        )
        result = await database.fetch_one(query)
        
        if result:
            return {
                **dict(result),
                "role_name": result["role_name"]
            }
        return None

    ## Employees update
    @staticmethod
    async def update_employees(employees_id: str, employee: EmployeesUpdate):
        gDate = str(datetime.datetime.now())
        query = employees.update().\
            where(employees.c.employees_id == employees_id).\
            values(
                first_name     = employee.first_name,
                last_name      = employee.last_name,
                email          = employee.email,
                phone          = employee.phone,
                gender         = employee.gender,
                designation    = employee.designation,
                role           = employee.role,
                skill          = employee.skill,        
                experience     = employee.experience,         
                qualification  = employee.qualification,     
                state          = employee.state, 
                city           = employee.city,
                status         = employee.status,
                create_at      = gDate,
                inactive_at    = employee.inactive_at if employee.inactive_at else None,
            )
        await database.execute(query)

        # ✅ Fetch and return updated employee
        return await EmployeesCurdOperation.find_employees_by_id(employees_id)


    ## Employees Delete
    @staticmethod
    async def delete_employee(employeeId: str):
        # 1. Check if employee exists
        existing = await EmployeesCurdOperation.find_employees_by_id(employeeId)
        if not existing:
            return {"status": False, "message": "Employee not found."}

        # 2. If exists, delete
        query = employees.delete().where(employees.c.employees_id == employeeId)
        await database.execute(query)

        return {"status": True, "message": "Employee has been deleted successfully."}
    