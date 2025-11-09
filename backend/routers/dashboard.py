from fastapi import APIRouter, HTTPException, status
from curd.dashboard import DashboardCurdOperation
import logging

router = APIRouter(prefix="/dashboard", tags=["Dashboard"])
logger = logging.getLogger(__name__)

@router.get("/summary")
async def get_dashboard_summary():
    try:
        data = await DashboardCurdOperation.get_dashboard_summary()
        return data
    except HTTPException as he:
        # Preserve original FastAPI HTTP errors (e.g., 404/400 you may raise inside the CRUD)
        logger.warning("get_dashboard_summary HTTPException: %s", he.detail)
        raise
    except Exception as exc:
        # Log the stacktrace for debugging/observability
        logger.exception("Failed to load dashboard summary")
        # Return a controlled 500 with a helpful message + actual error string
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to load dashboard summary: {exc}"
        ) from exc