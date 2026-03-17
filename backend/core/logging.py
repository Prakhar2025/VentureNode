"""
VentureNode — Structured Logging Configuration.

Configures structlog for consistent, machine-readable JSON log output in
production and human-friendly colored output in development.
"""

from __future__ import annotations

import logging
import sys

import structlog

from backend.core.config import get_settings


def configure_logging() -> None:
    """Configure structlog and stdlib logging for the application.

    In development: outputs colorized, human-readable text to stdout.
    In production:  outputs structured JSON for log aggregation pipelines.
    """
    settings = get_settings()

    shared_processors: list = [
        structlog.contextvars.merge_contextvars,
        structlog.processors.add_log_level,
        structlog.processors.TimeStamper(fmt="iso"),
    ]

    if settings.is_production:
        processors = shared_processors + [structlog.processors.JSONRenderer()]
    else:
        processors = shared_processors + [
            structlog.dev.ConsoleRenderer(colors=True),
        ]

    structlog.configure(
        processors=processors,
        wrapper_class=structlog.make_filtering_bound_logger(
            logging.DEBUG if settings.debug else logging.INFO
        ),
        context_class=dict,
        logger_factory=structlog.PrintLoggerFactory(sys.stdout),
        cache_logger_on_first_use=True,
    )


def get_logger(name: str) -> structlog.BoundLogger:
    """Return a bound structlog logger instance.

    Args:
        name: Module or component name to attach to log records.

    Returns:
        structlog.BoundLogger: A configured logger instance.
    """
    return structlog.get_logger(name)
