"""
VentureNode — FastAPI Application Entry Point.

This module defines the FastAPI application instance, configures all
middleware (CORS, rate limiting, logging), registers API routers, and
exposes the ASGI callable used by the Uvicorn server.
"""

from __future__ import annotations

from contextlib import asynccontextmanager
from typing import AsyncGenerator

from fastapi import FastAPI, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from slowapi.util import get_remote_address

from backend.api.routes import router as api_router
from backend.core.config import get_settings
from backend.core.logging import configure_logging, get_logger

# ------------------------------------------------------------------ #
# Startup / Shutdown Lifecycle                                         #
# ------------------------------------------------------------------ #


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    """Manage application lifespan: startup and graceful shutdown.

    All one-time startup logic (DB connections, cache warming, etc.)
    lives here. The yield separates startup from shutdown logic.

    Args:
        app: The FastAPI application instance.
    """
    configure_logging()
    logger = get_logger(__name__)
    settings = get_settings()

    logger.info(
        "VentureNode starting up",
        app_name=settings.app_name,
        version=settings.app_version,
        environment=settings.environment,
    )

    yield  # Application is running

    logger.info("VentureNode shutting down gracefully.")


# ------------------------------------------------------------------ #
# Application Factory                                                  #
# ------------------------------------------------------------------ #


def create_application() -> FastAPI:
    """Construct and configure the FastAPI application.

    Returns:
        FastAPI: A fully configured ASGI application instance.
    """
    settings = get_settings()

    app = FastAPI(
        title=settings.app_name,
        version=settings.app_version,
        description=(
            "VentureNode — Autonomous AI Operating System for Startups. "
            "Orchestrates a multi-agent LangGraph pipeline over a Notion workspace."
        ),
        license_info={"name": "MIT", "url": "https://opensource.org/licenses/MIT"},
        docs_url="/api/docs" if not settings.is_production else None,
        redoc_url="/api/redoc" if not settings.is_production else None,
        openapi_url="/api/openapi.json" if not settings.is_production else None,
        lifespan=lifespan,
    )

    # ---- Rate Limiter ------------------------------------------------ #
    limiter = Limiter(
        key_func=get_remote_address,
        default_limits=[f"{settings.rate_limit_per_minute}/minute"],
    )
    app.state.limiter = limiter
    app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

    # ---- CORS -------------------------------------------------------- #
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins,
        allow_credentials=True,
        allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
        allow_headers=["*"],
    )

    # ---- Routers ----------------------------------------------------- #
    app.include_router(api_router, prefix="/api/v1")

    # ---- Global Exception Handler ------------------------------------ #
    @app.exception_handler(Exception)
    async def global_exception_handler(request: Request, exc: Exception) -> JSONResponse:
        """Catch-all handler for unhandled exceptions.

        Prevents raw tracebacks from leaking into API responses. All
        unexpected errors are logged server-side and a sanitized 500
        response is returned to the client.

        Args:
            request: The incoming HTTP request.
            exc: The unhandled exception.

        Returns:
            JSONResponse: A sanitized 500 error response.
        """
        logger = get_logger(__name__)
        logger.error(
            "Unhandled exception",
            path=str(request.url),
            method=request.method,
            error=str(exc),
            exc_info=True,
        )
        return JSONResponse(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            content={
                "error": "Internal Server Error",
                "message": "An unexpected error occurred. Please try again later.",
            },
        )

    return app


# ------------------------------------------------------------------ #
# ASGI Entrypoint                                                      #
# ------------------------------------------------------------------ #

app = create_application()
