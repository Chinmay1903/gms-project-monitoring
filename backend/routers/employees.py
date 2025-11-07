from schema.employees import EmployeesList,EmployeesUpdate, EmployeesEntry
from curd.employees import EmployeesCurdOperation
from fastapi import APIRouter, HTTPException, status
import logging
from typing import List, Dict, Any

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/employees", tags=["Employees"])

# Get all employees names and ids
@router.get("/names")
async def find_all_employees_name():
    try:
        return await EmployeesCurdOperation.find_all_employees_name()
    except HTTPException as he:
        logger.warning("find_all_employees_name HTTPException: %s", he.detail)
        raise
    except Exception as exc:
        logger.exception("Failed to list employee names")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={"message": "Failed to list employee names", "error": str(exc)},
        )

# Get all employees
@router.get("", response_model=List[EmployeesList])
async def find_all_employees():
    try:
        return await EmployeesCurdOperation.find_all_employees()
    except HTTPException as he:
        logger.warning("find_all_employees HTTPException: %s", he.detail)
        raise
    except Exception as exc:
        logger.exception("Failed to list employees")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={"message": "Failed to list employees", "error": str(exc)},
        )

# Register employee
@router.post("", response_model=EmployeesList)
async def register_employee(employee: EmployeesEntry):
    try:
        return await EmployeesCurdOperation.register_employee(employee)
    except HTTPException as he:
        logger.warning("register_employee HTTPException: %s", he.detail)
        raise
    except Exception as exc:
        logger.exception("Failed to create employee")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={"message": "Failed to create employee", "error": str(exc)},
        )

# Get employee by ID
@router.get("/{employeeId}", response_model=EmployeesList)
async def find_employee_by_id(employeeId: str):
    try:
        result = await EmployeesCurdOperation.find_employees_by_id(employeeId)
        if not result:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Employee '{employeeId}' not found",
            )
        return result
    except HTTPException as he:
        logger.warning("find_employee_by_id HTTPException (employeeId=%s): %s", employeeId, he.detail)
        raise
    except Exception as exc:
        logger.exception("Failed to fetch employee (employeeId=%s)", employeeId)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={"message": f"Failed to fetch employee '{employeeId}'", "error": str(exc)},
        )

# Update employee
@router.put("/{employeeId}", response_model=EmployeesList)
async def update_employee(employeeId: str, employee: EmployeesUpdate):
    try:
        return await EmployeesCurdOperation.update_employees(employeeId, employee)
    except HTTPException as he:
        logger.warning("update_employee HTTPException (employeeId=%s): %s", employeeId, he.detail)
        raise
    except Exception as exc:
        logger.exception("Failed to update employee (employeeId=%s)", employeeId)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={"message": f"Failed to update employee '{employeeId}'", "error": str(exc)},
        )

# Delete employee
@router.delete("/{employeeId}")
async def delete_employee(employeeId: str) -> Dict[str, Any]:
    try:
        return await EmployeesCurdOperation.delete_employee(employeeId)
    except HTTPException as he:
        logger.warning("delete_employee HTTPException (employeeId=%s): %s", employeeId, he.detail)
        raise
    except Exception as exc:
        logger.exception("Failed to delete employee (employeeId=%s)", employeeId)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={"message": f"Failed to delete employee '{employeeId}'", "error": str(exc)},
        )
