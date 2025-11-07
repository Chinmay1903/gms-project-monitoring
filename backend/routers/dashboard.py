from fastapi import APIRouter
# from schema.dashboard import DashboardSummary
from curd.dashboard import DashboardCurdOperation

router = APIRouter(prefix="/dashboard", tags=["Dashboard"])

# Get Dashboard Summary
@router.get("/summary", tags=["Dashboard"])
async def get_dashboard_summary():
    return await DashboardCurdOperation.get_dashboard_summary()