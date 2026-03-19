"""
VentureNode — REST API Router.

Defines all HTTP endpoints exposed by the VentureNode backend. This router
is mounted at /api/v1 in main.py.

Endpoint groups:
  /health          — System and integration health checks.
  /notion/*        — Direct Notion database read endpoints.
  /workflow/*      — Agent workflow trigger and status endpoints.
  /monitor/*       — Manual agent execution triggers.
"""

from __future__ import annotations

from typing import Annotated, Any

from fastapi import APIRouter, Depends, HTTPException, Request, status
from notion_client import AsyncClient
from pydantic import BaseModel, Field
from slowapi import Limiter
from slowapi.util import get_remote_address

from backend.core.logging import get_logger
from backend.notion import mcp_client
from backend.notion.mcp_client import get_notion_client

logger = get_logger(__name__)
router = APIRouter()
limiter = Limiter(key_func=get_remote_address)


# ------------------------------------------------------------------ #
# Dependency Injection                                                 #
# ------------------------------------------------------------------ #


async def get_client() -> AsyncClient:
    """FastAPI dependency that provides a Notion async client per request.

    Yields:
        AsyncClient: An authenticated Notion SDK client instance.
    """
    return get_notion_client()


NotionClient = Annotated[AsyncClient, Depends(get_client)]


# ------------------------------------------------------------------ #
# Request / Response Models                                            #
# ------------------------------------------------------------------ #


class WorkflowStartRequest(BaseModel):
    """Request body for starting a new VentureNode workflow."""

    idea: str = Field(
        ...,
        min_length=10,
        max_length=2000,
        description="The startup idea description to analyze.",
        examples=["An AI-powered personal finance advisor for Gen Z users."],
    )


class WorkflowStartResponse(BaseModel):
    """Response body confirming a workflow has been initiated."""

    run_id: str = Field(..., description="Unique identifier for this workflow run.")
    status: str = Field(..., description="Initial workflow status.")
    message: str = Field(..., description="Human-readable status message.")


class HealthResponse(BaseModel):
    """Response body for the health check endpoint."""

    status: str
    version: str
    notion: dict[str, Any]


# ------------------------------------------------------------------ #
# Health Checks                                                        #
# ------------------------------------------------------------------ #


@router.get(
    "/health",
    response_model=HealthResponse,
    summary="System Health Check",
    description=(
        "Returns the operational status of the VentureNode backend and "
        "verifies connectivity to the Notion workspace."
    ),
    tags=["Health"],
)
async def health_check(client: NotionClient) -> HealthResponse:
    """Verify that the API is responsive and the Notion integration is authenticated.

    Args:
        client: Injected authenticated Notion client.

    Returns:
        HealthResponse: Current system health and Notion connectivity status.
    """
    from backend.core.config import get_settings

    settings = get_settings()
    notion_status = await mcp_client.verify_connection(client)

    return HealthResponse(
        status="operational",
        version=settings.app_version,
        notion=notion_status,
    )


# ------------------------------------------------------------------ #
# Notion Database Read Endpoints                                       #
# ------------------------------------------------------------------ #


@router.get(
    "/notion/ideas",
    summary="List All Ideas",
    description="Fetch all startup idea records from the Notion Ideas database.",
    tags=["Notion"],
)
async def list_ideas(client: NotionClient) -> dict[str, Any]:
    """Return all records from the Notion Ideas database.

    Args:
        client: Injected authenticated Notion client.

    Returns:
        dict: JSON payload with 'count' and 'results' keys.

    Raises:
        HTTPException: 503 if the Ideas database ID is not configured.
        HTTPException: 502 if the Notion API returns an unexpected error.
    """
    try:
        results = await mcp_client.get_ideas(client)
        return {"count": len(results), "results": results}
    except RuntimeError as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=str(exc)
        ) from exc
    except Exception as exc:
        logger.error("Failed to fetch Ideas", error=str(exc))
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Failed to retrieve data from Notion.",
        ) from exc


@router.get(
    "/notion/research",
    summary="List All Research",
    description="Fetch all market research records from the Notion Research database.",
    tags=["Notion"],
)
async def list_research(client: NotionClient) -> dict[str, Any]:
    """Return all records from the Notion Research database.

    Args:
        client: Injected authenticated Notion client.

    Returns:
        dict: JSON payload with 'count' and 'results' keys.

    Raises:
        HTTPException: 503 if the Research database ID is not configured.
        HTTPException: 502 if the Notion API returns an unexpected error.
    """
    try:
        results = await mcp_client.get_research(client)
        return {"count": len(results), "results": results}
    except RuntimeError as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=str(exc)
        ) from exc
    except Exception as exc:
        logger.error("Failed to fetch Research", error=str(exc))
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Failed to retrieve data from Notion.",
        ) from exc


@router.get(
    "/notion/roadmap",
    summary="List Roadmap Items",
    description="Fetch all milestone records from the Notion Roadmap database.",
    tags=["Notion"],
)
async def list_roadmap(client: NotionClient) -> dict[str, Any]:
    """Return all records from the Notion Roadmap database.

    Args:
        client: Injected authenticated Notion client.

    Returns:
        dict: JSON payload with 'count' and 'results' keys.

    Raises:
        HTTPException: 503 if the Roadmap database ID is not configured.
        HTTPException: 502 if the Notion API returns an unexpected error.
    """
    try:
        results = await mcp_client.get_roadmap(client)
        return {"count": len(results), "results": results}
    except RuntimeError as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=str(exc)
        ) from exc
    except Exception as exc:
        logger.error("Failed to fetch Roadmap", error=str(exc))
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Failed to retrieve data from Notion.",
        ) from exc


@router.get(
    "/notion/tasks",
    summary="List All Tasks",
    description="Fetch all execution task records from the Notion Tasks database.",
    tags=["Notion"],
)
async def list_tasks(client: NotionClient) -> dict[str, Any]:
    """Return all records from the Notion Tasks database.

    Args:
        client: Injected authenticated Notion client.

    Returns:
        dict: JSON payload with 'count' and 'results' keys.

    Raises:
        HTTPException: 503 if the Tasks database ID is not configured.
        HTTPException: 502 if the Notion API returns an unexpected error.
    """
    try:
        results = await mcp_client.get_tasks(client)
        return {"count": len(results), "results": results}
    except RuntimeError as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=str(exc)
        ) from exc
    except Exception as exc:
        logger.error("Failed to fetch Tasks", error=str(exc))
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Failed to retrieve data from Notion.",
        ) from exc


# ------------------------------------------------------------------ #
# Workflow Endpoints                                                   #
# ------------------------------------------------------------------ #


@router.post(
    "/workflow/start",
    response_model=WorkflowStartResponse,
    status_code=status.HTTP_202_ACCEPTED,
    summary="Start VentureNode Workflow",
    description=(
        "Triggers the full VentureNode agent pipeline for a given startup idea. "
        "The workflow runs asynchronously. Poll /workflow/{run_id}/status for updates."
    ),
    tags=["Workflow"],
)
async def start_workflow(
    request: Request,
    body: WorkflowStartRequest,
    client: NotionClient,
) -> WorkflowStartResponse:
    """Initiate the multi-agent workflow for a startup idea.

    Validates the Notion connection, generates a run ID, and launches
    the full LangGraph pipeline as a non-blocking background task.

    Args:
        request: The incoming HTTP request (used by rate limiter).
        body: Validated request payload containing the idea description.
        client: Injected authenticated Notion client.

    Returns:
        WorkflowStartResponse: Acknowledgement with a run ID for status polling.

    Raises:
        HTTPException: 503 if required database IDs are not configured.
        HTTPException: 502 if the Notion API returns an error.
    """
    import asyncio
    import uuid

    from backend.orchestrator.graph import run_pipeline

    run_id = str(uuid.uuid4())

    logger.info("Workflow start requested", run_id=run_id, idea_preview=body.idea[:80])

    # Verify Notion connectivity before launching the pipeline
    notion_status = await mcp_client.verify_connection(client)
    if not notion_status.get("connected"):
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Cannot connect to Notion workspace: {notion_status.get('error')}",
        )

    # Launch the pipeline as a fire-and-forget background task.
    # The client polls /workflow/{run_id}/status for updates.
    asyncio.create_task(run_pipeline(run_id=run_id, idea_text=body.idea))

    return WorkflowStartResponse(
        run_id=run_id,
        status="running",
        message=(
            "VentureNode pipeline has started. The Idea Analyzer Agent is now "
            "processing your idea. Check your Notion workspace for the Ideas page "
            "and approve it when the analysis is complete to proceed to market research."
        ),
    )



@router.get(
    "/workflow/{run_id}/status",
    summary="Get Workflow Status",
    description="Poll the current execution status of a running VentureNode workflow.",
    tags=["Workflow"],
)
async def get_workflow_status(run_id: str) -> dict[str, Any]:
    """Return the current status of a workflow run by its ID.

    Args:
        run_id: The UUID returned by the /workflow/start endpoint.

    Returns:
        dict: Status payload including run_id and current state.
    """
    from backend.orchestrator.graph import get_run_state
    
    state = get_run_state(run_id)
    
    if not state:
        return {
            "run_id": run_id,
            "status": "not_found",
            "message": "Workflow run not found or has not started yet.",
        }

    current_step = state.get("current_step", "initializing")
    error = state.get("error")
    
    # Map graph steps to a frontend-friendly status
    if error:
        status_code = "error"
        message = f"Pipeline failed at {current_step}: {error}"
    elif current_step in ["memory_stored", "pipeline_end"]:
        status_code = "done"
        message = "Pipeline completed successfully."
    else:
        status_code = "running"
        message = f"Agent is currently running step: {current_step.replace('_', ' ').title()}"

    return {
        "run_id": run_id,
        "status": status_code,
        "message": message,
        "step": current_step,
        "human_approved_idea": state.get("human_approved_idea", False),
        "human_approved_research": state.get("human_approved_research", False)
    }


# ------------------------------------------------------------------ #
# Monitor Endpoint                                                     #
# ------------------------------------------------------------------ #


@router.post(
    "/monitor/report",
    status_code=status.HTTP_202_ACCEPTED,
    summary="Generate Execution Report",
    description=(
        "Manually trigger the Execution Monitor Agent to analyze current task "
        "completion and generate a report in the Notion Reports database."
    ),
    tags=["Monitor"],
)
async def trigger_report(client: NotionClient) -> dict[str, str]:
    """Manually invoke the Execution Monitor Agent.

    Args:
        client: Injected authenticated Notion client.

    Returns:
        dict: Acknowledgement payload.
    """
    logger.info("Manual report generation triggered")
    # NOTE: ExecutionMonitorAgent will be wired in Phase 2.
    return {
        "status": "accepted",
        "message": "Report generation will be available after Phase 2 agent integration.",
    }
