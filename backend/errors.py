from fastapi import Request
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from starlette import status

def http_error_handler(request: Request, exc):
    # FastAPI’s HTTPException already has status_code & detail
    return JSONResponse(status_code=exc.status_code, content={"detail": exc.detail})

def validation_exception_handler(request: Request, exc: RequestValidationError):
    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content={"detail": "Validation error", "errors": exc.errors()},
    )

def unhandled_exception_handler(request: Request, exc: Exception):
    # Hide internals from clients; log exc in real apps
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={"detail": "Internal server error", "code": "INTERNAL_ERROR"},
    )
