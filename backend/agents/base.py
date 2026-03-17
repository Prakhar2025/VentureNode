"""
VentureNode — Base Agent Infrastructure.

Provides shared utilities used by all five VentureNode agents:
  - LLM factory with consistent Groq configuration.
  - Standardized error capture that writes failures into AgentState
    without crashing the pipeline.
  - Shared logging convention for agent activity.
"""

from __future__ import annotations

from typing import Any, Optional

from langchain_groq import ChatGroq

from backend.core.config import get_settings
from backend.core.logging import get_logger

logger = get_logger(__name__)


def get_llm(temperature_override: Optional[float] = None) -> ChatGroq:
    """Instantiate and return a configured Groq ChatGroq LLM client.

    All agents share a consistent LLM configuration derived from
    the application settings. Temperature can be overridden for agents
    that need more deterministic (lower) or creative (higher) output.

    Args:
        temperature_override: Optional temperature to use instead of
            the global setting. Useful for agents like the task planner
            that need more deterministic, structured output.

    Returns:
        ChatGroq: A fully configured LangChain Groq LLM instance.
    """
    settings = get_settings()
    return ChatGroq(
        api_key=settings.groq_api_key_value,
        model=settings.groq_model,
        temperature=temperature_override
        if temperature_override is not None
        else settings.groq_temperature,
    )


def capture_error(state: dict[str, Any], agent_name: str, exc: Exception) -> dict[str, Any]:
    """Record an agent exception into the pipeline state without crashing.

    Errors are logged server-side with full context and written into
    the 'error' field of AgentState so the orchestrator can handle
    graceful degradation or retry logic.

    Args:
        state: The current LangGraph AgentState dict.
        agent_name: Human-readable name of the agent that failed.
        exc: The exception that was raised.

    Returns:
        dict: Partial state update with the error message populated.
    """
    error_message = f"[{agent_name}] {type(exc).__name__}: {exc}"
    logger.error(
        "Agent execution failed",
        agent=agent_name,
        error=str(exc),
        exc_info=True,
    )
    return {
        "error": error_message,
        "current_step": f"ERROR in {agent_name}",
    }


def log_agent_start(agent_name: str, run_id: str, **context: Any) -> None:
    """Emit a structured log entry at agent invocation time.

    Args:
        agent_name: The name of the agent starting execution.
        run_id: The workflow run identifier.
        **context: Additional key-value pairs to attach to the log record.
    """
    logger.info(
        f"{agent_name} started",
        agent=agent_name,
        run_id=run_id,
        **context,
    )


def log_agent_complete(agent_name: str, run_id: str, **context: Any) -> None:
    """Emit a structured log entry at agent completion time.

    Args:
        agent_name: The name of the agent that completed.
        run_id: The workflow run identifier.
        **context: Additional key-value pairs to attach to the log record.
    """
    logger.info(
        f"{agent_name} completed",
        agent=agent_name,
        run_id=run_id,
        **context,
    )
