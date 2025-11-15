from fastapi import APIRouter, HTTPException, status
from curd.dashboard import DashboardCurdOperation
from fastapi.responses import StreamingResponse
import logging

###########
import io
import math          
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt

from reportlab.lib.pagesizes import A4, landscape
from reportlab.lib.styles import getSampleStyleSheet
from reportlab.platypus import (SimpleDocTemplate,Table,TableStyle,Paragraph,Spacer,Image)
from reportlab.lib import colors
########

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
    
##--------------PDF---------------
@router.get("/summary/pdf")
async def get_dashboard_summary_pdf():
    """
    Download the dashboard summary (same data as /summary)
    as a PDF file (table + charts).
    """
    try:
        pdf_bytes = await DashboardCurdOperation.get_dashboard_summary_pdf()

        return StreamingResponse(
            io.BytesIO(pdf_bytes),
            media_type="application/pdf",
            headers={
                "Content-Disposition": 'attachment; filename="dashboard-summary.pdf"'
            },
        )
    except HTTPException as he:
        logger.warning("get_dashboard_summary_pdf HTTPException: %s", he.detail)
        raise
    except Exception as exc:
        logger.exception("Failed to export dashboard summary PDF")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to export dashboard summary PDF: {exc}",
        ) from exc
