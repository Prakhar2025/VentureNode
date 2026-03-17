"""
VentureNode — Notion MCP Client.

This module is the single, authoritative interface between VentureNode's
agent system and the Notion workspace. All Notion reads and writes are
routed through this client — no other module interacts with the Notion
SDK directly.

The client is intentionally designed around the five VentureNode databases:
  - Ideas      : Raw startup idea intake and AI scoring.
  - Research   : Live market intelligence and competitor summaries.
  - Roadmap    : Phase-by-phase product milestones.
  - Tasks      : Granular execution tickets.
  - Reports    : Weekly executive summaries and bottleneck diagnostics.
"""

from __future__ import annotations

import asyncio
from datetime import datetime
from typing import Any, Optional

from notion_client import AsyncClient
from notion_client.errors import APIResponseError

from backend.core.config import get_settings
from backend.core.logging import get_logger

logger = get_logger(__name__)


# ------------------------------------------------------------------ #
# Client Factory                                                       #
# ------------------------------------------------------------------ #


def get_notion_client() -> AsyncClient:
    """Instantiate and return an authenticated async Notion client.

    Returns:
        AsyncClient: A configured Notion SDK async client instance.
    """
    settings = get_settings()
    return AsyncClient(auth=settings.notion_token_value)


# ------------------------------------------------------------------ #
# Type Helpers                                                         #
# ------------------------------------------------------------------ #


def _rich_text(content: str) -> list[dict]:
    """Build a Notion rich_text property value from a plain string.

    Args:
        content: The plain text string to convert.

    Returns:
        list[dict]: A Notion-compatible rich_text array.
    """
    return [{"type": "text", "text": {"content": content[:2000]}}]


def _title(content: str) -> list[dict]:
    """Build a Notion title property value from a plain string.

    Args:
        content: The title string.

    Returns:
        list[dict]: A Notion-compatible title array.
    """
    return [{"type": "text", "text": {"content": content[:255]}}]


def _select(option: str) -> dict:
    """Build a Notion select property value.

    Args:
        option: The select option name.

    Returns:
        dict: A Notion-compatible select property value.
    """
    return {"name": option}


def _relation(page_ids: list[str]) -> list[dict]:
    """Build a Notion relation property value from a list of page IDs.

    Args:
        page_ids: List of Notion page IDs to link.

    Returns:
        list[dict]: A Notion-compatible relation array.
    """
    return [{"id": pid} for pid in page_ids]


# ------------------------------------------------------------------ #
# Ideas Database                                                       #
# ------------------------------------------------------------------ #


async def create_idea(
    client: AsyncClient,
    idea_name: str,
    description: str,
    opportunity_score: float,
    risk_score: float,
) -> str:
    """Create a new record in the Notion Ideas database.

    Args:
        client: Authenticated Notion async client.
        idea_name: The startup idea title.
        description: Full description of the idea.
        opportunity_score: AI-generated opportunity score (1–10).
        risk_score: AI-generated risk score (1–10).

    Returns:
        str: The Notion page ID of the newly created record.

    Raises:
        APIResponseError: If the Notion API returns an error response.
        RuntimeError: If the Ideas database ID is not configured.
    """
    settings = get_settings()
    if not settings.notion_ideas_db_id:
        raise RuntimeError(
            "NOTION_IDEAS_DB_ID is not set. Configure this environment variable "
            "before running the Idea Analyzer Agent."
        )

    try:
        response = await client.pages.create(
            parent={"database_id": settings.notion_ideas_db_id},
            properties={
                "Idea Name": {"title": _title(idea_name)},
                "Description": {"rich_text": _rich_text(description)},
                "Opportunity Score": {"number": round(opportunity_score, 1)},
                "Risk Score": {"number": round(risk_score, 1)},
                "Status": {"select": _select("Pending Approval")},
                "Approved": {"checkbox": False},
                "Date Created": {"date": {"start": datetime.utcnow().isoformat()}},
            },
        )
        page_id: str = response["id"]
        logger.info("Created Idea record in Notion", page_id=page_id, idea_name=idea_name)
        return page_id

    except APIResponseError as exc:
        logger.error("Failed to create Idea record", error=str(exc), idea_name=idea_name)
        raise


async def get_ideas(client: AsyncClient) -> list[dict[str, Any]]:
    """Retrieve all records from the Notion Ideas database.

    Args:
        client: Authenticated Notion async client.

    Returns:
        list[dict]: Raw Notion page objects from the Ideas database.

    Raises:
        RuntimeError: If the Ideas database ID is not configured.
    """
    settings = get_settings()
    if not settings.notion_ideas_db_id:
        raise RuntimeError("NOTION_IDEAS_DB_ID is not configured.")

    results: list[dict] = []
    cursor: Optional[str] = None

    while True:
        kwargs: dict[str, Any] = {"database_id": settings.notion_ideas_db_id}
        if cursor:
            kwargs["start_cursor"] = cursor

        response = await client.databases.query(**kwargs)
        results.extend(response.get("results", []))

        if not response.get("has_more"):
            break
        cursor = response.get("next_cursor")

    return results


async def poll_idea_approval(
    client: AsyncClient,
    page_id: str,
    poll_interval_seconds: float = 10.0,
    timeout_seconds: float = 3600.0,
) -> bool:
    """Poll the Notion Ideas database for founder approval.

    Periodically checks the 'Approved' checkbox on the specified Idea page.
    This implements the human-in-the-loop checkpoint: the agent pipeline is
    paused until the founder explicitly checks the box in Notion.

    Args:
        client: Authenticated Notion async client.
        page_id: The Notion page ID to monitor.
        poll_interval_seconds: How often to poll, in seconds. Defaults to 10.
        timeout_seconds: Maximum wait time before giving up. Defaults to 1 hour.

    Returns:
        bool: True if approved within the timeout window, False otherwise.
    """
    elapsed = 0.0
    logger.info("Polling Notion for idea approval", page_id=page_id)

    while elapsed < timeout_seconds:
        try:
            page = await client.pages.retrieve(page_id=page_id)
            approved: bool = page["properties"]["Approved"]["checkbox"]

            if approved:
                logger.info("Idea approved by founder", page_id=page_id)
                return True

        except APIResponseError as exc:
            logger.warning("Poll attempt failed", page_id=page_id, error=str(exc))

        await asyncio.sleep(poll_interval_seconds)
        elapsed += poll_interval_seconds

    logger.warning("Approval polling timed out", page_id=page_id, timeout=timeout_seconds)
    return False


async def update_idea_status(
    client: AsyncClient,
    page_id: str,
    status: str,
) -> None:
    """Update the Status field on an existing Idea page.

    Args:
        client: Authenticated Notion async client.
        page_id: The target Notion page ID.
        status: The new status string (e.g. 'Approved', 'Rejected').

    Raises:
        APIResponseError: If the Notion API returns an error response.
    """
    try:
        await client.pages.update(
            page_id=page_id,
            properties={"Status": {"select": _select(status)}},
        )
        logger.info("Updated Idea status", page_id=page_id, status=status)
    except APIResponseError as exc:
        logger.error("Failed to update Idea status", page_id=page_id, error=str(exc))
        raise


# ------------------------------------------------------------------ #
# Research Database                                                    #
# ------------------------------------------------------------------ #


async def create_research(
    client: AsyncClient,
    topic: str,
    summary: str,
    sources: list[str],
    confidence: str,
    related_idea_id: str,
) -> str:
    """Create a new record in the Notion Research database.

    Args:
        client: Authenticated Notion async client.
        topic: The research topic or competitive angle.
        summary: Full AI-generated research summary.
        sources: List of source URLs referenced in the summary.
        confidence: Confidence level ('High', 'Medium', 'Low').
        related_idea_id: Notion page ID of the parent Idea record.

    Returns:
        str: The Notion page ID of the created research record.

    Raises:
        APIResponseError: If the Notion API returns an error.
        RuntimeError: If the Research database ID is not configured.
    """
    settings = get_settings()
    if not settings.notion_research_db_id:
        raise RuntimeError("NOTION_RESEARCH_DB_ID is not configured.")

    try:
        response = await client.pages.create(
            parent={"database_id": settings.notion_research_db_id},
            properties={
                "Topic": {"title": _title(topic)},
                "Summary": {"rich_text": _rich_text(summary)},
                "Sources": {
                    "multi_select": [{"name": s[:100]} for s in sources[:10]]
                },
                "Confidence Level": {"select": _select(confidence)},
                "Related Idea": {"relation": _relation([related_idea_id])},
            },
        )
        page_id: str = response["id"]
        logger.info("Created Research record", page_id=page_id, topic=topic)
        return page_id
    except APIResponseError as exc:
        logger.error("Failed to create Research record", error=str(exc))
        raise


async def get_research(client: AsyncClient) -> list[dict[str, Any]]:
    """Retrieve all records from the Notion Research database.

    Args:
        client: Authenticated Notion async client.

    Returns:
        list[dict]: Raw Notion page objects.

    Raises:
        RuntimeError: If the Research database ID is not configured.
    """
    settings = get_settings()
    if not settings.notion_research_db_id:
        raise RuntimeError("NOTION_RESEARCH_DB_ID is not configured.")

    response = await client.databases.query(database_id=settings.notion_research_db_id)
    return response.get("results", [])


# ------------------------------------------------------------------ #
# Roadmap Database                                                     #
# ------------------------------------------------------------------ #


async def create_roadmap_item(
    client: AsyncClient,
    feature_name: str,
    priority: str,
    phase: int,
    owner: str = "AI Agent",
) -> str:
    """Create a new milestone record in the Notion Roadmap database.

    Args:
        client: Authenticated Notion async client.
        feature_name: Name of the product feature or milestone.
        priority: 'High', 'Medium', or 'Low'.
        phase: Development phase number (1, 2, or 3).
        owner: Responsible owner. Defaults to 'AI Agent'.

    Returns:
        str: The Notion page ID of the created roadmap record.

    Raises:
        APIResponseError: If the Notion API returns an error.
        RuntimeError: If the Roadmap database ID is not configured.
    """
    settings = get_settings()
    if not settings.notion_roadmap_db_id:
        raise RuntimeError("NOTION_ROADMAP_DB_ID is not configured.")

    try:
        response = await client.pages.create(
            parent={"database_id": settings.notion_roadmap_db_id},
            properties={
                "Feature Name": {"title": _title(feature_name)},
                "Priority": {"select": _select(priority)},
                "Phase": {"number": phase},
                "Status": {"select": _select("Not Started")},
                "Owner": {"rich_text": _rich_text(owner)},
            },
        )
        page_id: str = response["id"]
        logger.info("Created Roadmap item", page_id=page_id, feature=feature_name)
        return page_id
    except APIResponseError as exc:
        logger.error("Failed to create Roadmap item", error=str(exc))
        raise


async def get_roadmap(client: AsyncClient) -> list[dict[str, Any]]:
    """Retrieve all records from the Notion Roadmap database.

    Args:
        client: Authenticated Notion async client.

    Returns:
        list[dict]: Raw Notion page objects.

    Raises:
        RuntimeError: If the Roadmap database ID is not configured.
    """
    settings = get_settings()
    if not settings.notion_roadmap_db_id:
        raise RuntimeError("NOTION_ROADMAP_DB_ID is not configured.")

    response = await client.databases.query(database_id=settings.notion_roadmap_db_id)
    return response.get("results", [])


# ------------------------------------------------------------------ #
# Tasks Database                                                       #
# ------------------------------------------------------------------ #


async def create_task(
    client: AsyncClient,
    task_title: str,
    description: str,
    priority: str,
    deadline: Optional[str],
    assigned_agent: str,
    related_feature_id: Optional[str] = None,
) -> str:
    """Create a new execution task record in the Notion Tasks database.

    Args:
        client: Authenticated Notion async client.
        task_title: Short, actionable title for the task.
        description: Detailed description of what needs to be done.
        priority: 'P0' (critical), 'P1' (high), or 'P2' (normal).
        deadline: ISO 8601 date string for the deadline, or None.
        assigned_agent: Name of the agent or human responsible.
        related_feature_id: Notion page ID of the linked Roadmap item.

    Returns:
        str: The Notion page ID of the created task record.

    Raises:
        APIResponseError: If the Notion API returns an error.
        RuntimeError: If the Tasks database ID is not configured.
    """
    settings = get_settings()
    if not settings.notion_tasks_db_id:
        raise RuntimeError("NOTION_TASKS_DB_ID is not configured.")

    properties: dict[str, Any] = {
        "Task Title": {"title": _title(task_title)},
        "Description": {"rich_text": _rich_text(description)},
        "Priority": {"select": _select(priority)},
        "Status": {"select": _select("Backlog")},
        "Assigned Agent": {"select": _select(assigned_agent)},
    }

    if deadline:
        properties["Deadline"] = {"date": {"start": deadline}}

    if related_feature_id:
        properties["Related Feature"] = {"relation": _relation([related_feature_id])}

    try:
        response = await client.pages.create(
            parent={"database_id": settings.notion_tasks_db_id},
            properties=properties,
        )
        page_id: str = response["id"]
        logger.info("Created Task record", page_id=page_id, title=task_title)
        return page_id
    except APIResponseError as exc:
        logger.error("Failed to create Task record", error=str(exc))
        raise


async def get_tasks(client: AsyncClient) -> list[dict[str, Any]]:
    """Retrieve all records from the Notion Tasks database.

    Args:
        client: Authenticated Notion async client.

    Returns:
        list[dict]: Raw Notion page objects.

    Raises:
        RuntimeError: If the Tasks database ID is not configured.
    """
    settings = get_settings()
    if not settings.notion_tasks_db_id:
        raise RuntimeError("NOTION_TASKS_DB_ID is not configured.")

    response = await client.databases.query(database_id=settings.notion_tasks_db_id)
    return response.get("results", [])


# ------------------------------------------------------------------ #
# Reports Database                                                     #
# ------------------------------------------------------------------ #


async def create_report(
    client: AsyncClient,
    title: str,
    summary: str,
    insights: str,
    recommendations: str,
) -> str:
    """Create a new weekly report record in the Notion Reports database.

    Args:
        client: Authenticated Notion async client.
        title: Report title (e.g. 'Week 3 Execution Summary').
        summary: High-level summary of the week's progress.
        insights: Key observations and patterns identified.
        recommendations: Concrete next-step recommendations.

    Returns:
        str: The Notion page ID of the created report.

    Raises:
        APIResponseError: If the Notion API returns an error.
        RuntimeError: If the Reports database ID is not configured.
    """
    settings = get_settings()
    if not settings.notion_reports_db_id:
        raise RuntimeError("NOTION_REPORTS_DB_ID is not configured.")

    try:
        response = await client.pages.create(
            parent={"database_id": settings.notion_reports_db_id},
            properties={
                "Report Title": {"title": _title(title)},
                "Report Date": {"date": {"start": datetime.utcnow().date().isoformat()}},
                "Summary": {"rich_text": _rich_text(summary)},
                "Insights": {"rich_text": _rich_text(insights)},
                "Recommendations": {"rich_text": _rich_text(recommendations)},
            },
        )
        page_id: str = response["id"]
        logger.info("Created Report record", page_id=page_id, title=title)
        return page_id
    except APIResponseError as exc:
        logger.error("Failed to create Report record", error=str(exc))
        raise


# ------------------------------------------------------------------ #
# Connection Verification                                              #
# ------------------------------------------------------------------ #


async def verify_connection(client: AsyncClient) -> dict[str, Any]:
    """Verify connectivity to the Notion API and validate the integration token.

    Used by the health check endpoint to confirm the Notion integration
    is authenticated and operational.

    Args:
        client: Authenticated Notion async client.

    Returns:
        dict: A status object with 'connected' bool and 'user' info.
    """
    try:
        user = await client.users.me()
        return {
            "connected": True,
            "user": user.get("name", "Unknown"),
            "type": user.get("type", "Unknown"),
        }
    except APIResponseError as exc:
        logger.error("Notion connection verification failed", error=str(exc))
        return {"connected": False, "error": str(exc)}
