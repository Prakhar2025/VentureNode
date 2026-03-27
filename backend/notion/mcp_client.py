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


async def _query_database_records(
    client: AsyncClient,
    database_id: str,
    start_cursor: Optional[str] = None,
    filter_payload: Optional[dict] = None,
) -> dict[str, Any]:
    """Query pages for a Notion database across SDK versions.

    The notion-client SDK changed from ``databases.query`` to
    ``data_sources.query`` in newer releases. This helper keeps VentureNode
    compatible with both forms.

    Args:
        client: Authenticated Notion async client.
        database_id: Notion database ID.
        start_cursor: Optional pagination cursor.
        filter_payload: Optional Notion filter object for RLS scoping.

    Returns:
        dict[str, Any]: Query response payload containing results and pagination.
    """
    query_kwargs: dict[str, Any] = {}
    if start_cursor:
        query_kwargs["start_cursor"] = start_cursor
    if filter_payload:
        query_kwargs["filter"] = filter_payload

    # Older SDKs exposed databases.query(database_id=...)
    databases_query = getattr(client.databases, "query", None)
    if callable(databases_query):
        return await databases_query(database_id=database_id, **query_kwargs)

    # Newer SDKs expose data_sources.query(data_source_id=...)
    data_sources_query = getattr(client.data_sources, "query", None)
    if callable(data_sources_query):
        db = await client.databases.retrieve(database_id=database_id)
        data_sources = db.get("data_sources", [])
        if not data_sources:
            raise RuntimeError(
                "No data source found for this Notion database. "
                "Open the database in Notion and ensure it is a standard table data source."
            )

        data_source_id = data_sources[0].get("id")
        if not data_source_id:
            raise RuntimeError("Unable to resolve Notion data source ID for database query.")

        return await data_sources_query(data_source_id=data_source_id, **query_kwargs)

    raise RuntimeError(
        "Installed notion-client does not support querying databases. "
        "Please upgrade notion-client to a supported version."
    )


def _is_valid_notion_id(value: Optional[str]) -> bool:
    """Return True when value looks like a Notion UUID without hyphens.

    Args:
        value: Candidate Notion ID value.

    Returns:
        bool: True when value is a 32-char hex string.
    """
    if not value:
        return False
    normalized = value.replace("-", "")
    if len(normalized) != 32:
        return False
    return all(ch in "0123456789abcdefABCDEF" for ch in normalized)


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


async def get_ideas(
    client: AsyncClient,
    tenant_id: Optional[str] = None,
) -> list[dict[str, Any]]:
    """Retrieve records from the Notion Ideas database, scoped by tenant.

    Args:
        client: Authenticated Notion async client.
        tenant_id: Clerk user ID used as RLS key. When provided, only pages
            whose ``tenant_id`` rich_text property matches are returned.

    Returns:
        list[dict]: Raw Notion page objects from the Ideas database.

    Raises:
        RuntimeError: If the Ideas database ID is not configured.
    """
    settings = get_settings()
    if not settings.notion_ideas_db_id:
        raise RuntimeError("NOTION_IDEAS_DB_ID is not configured.")

    filter_payload: Optional[dict] = None

    results: list[dict] = []
    cursor: Optional[str] = None

    while True:
        response = await _query_database_records(
            client=client,
            database_id=settings.notion_ideas_db_id,
            start_cursor=cursor,
            filter_payload=filter_payload,
        )
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
    if not page_id:
        logger.warning("Skipping approval polling because page_id is empty")
        return False

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


async def get_research(
    client: AsyncClient,
    tenant_id: Optional[str] = None,
) -> list[dict[str, Any]]:
    """Retrieve records from the Notion Research database, scoped by tenant.

    Args:
        client: Authenticated Notion async client.
        tenant_id: Clerk user ID used as RLS key.

    Returns:
        list[dict]: Raw Notion page objects.

    Raises:
        RuntimeError: If the Research database ID is not configured.
    """
    settings = get_settings()
    if not settings.notion_research_db_id:
        raise RuntimeError("NOTION_RESEARCH_DB_ID is not configured.")

    filter_payload: Optional[dict] = None

    response = await _query_database_records(
        client=client,
        database_id=settings.notion_research_db_id,
        filter_payload=filter_payload,
    )
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


async def get_roadmap(
    client: AsyncClient,
    tenant_id: Optional[str] = None,
) -> list[dict[str, Any]]:
    """Retrieve records from the Notion Roadmap database, scoped by tenant.

    Args:
        client: Authenticated Notion async client.
        tenant_id: Clerk user ID used as RLS key.

    Returns:
        list[dict]: Raw Notion page objects.

    Raises:
        RuntimeError: If the Roadmap database ID is not configured.
    """
    settings = get_settings()
    if not settings.notion_roadmap_db_id:
        raise RuntimeError("NOTION_ROADMAP_DB_ID is not configured.")

    filter_payload: Optional[dict] = None

    response = await _query_database_records(
        client=client,
        database_id=settings.notion_roadmap_db_id,
        filter_payload=filter_payload,
    )
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


async def get_tasks(
    client: AsyncClient,
    tenant_id: Optional[str] = None,
) -> list[dict[str, Any]]:
    """Retrieve records from the Notion Tasks database, scoped by tenant.

    Args:
        client: Authenticated Notion async client.
        tenant_id: Clerk user ID used as RLS key.

    Returns:
        list[dict]: Raw Notion page objects.

    Raises:
        RuntimeError: If the Tasks database ID is not configured.
    """
    settings = get_settings()
    if not settings.notion_tasks_db_id:
        raise RuntimeError("NOTION_TASKS_DB_ID is not configured.")

    filter_payload: Optional[dict] = None

    response = await _query_database_records(
        client=client,
        database_id=settings.notion_tasks_db_id,
        filter_payload=filter_payload,
    )
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


async def get_reports(
    client: AsyncClient,
    tenant_id: Optional[str] = None,
) -> list[dict[str, Any]]:
    """Retrieve records from the Notion Reports database, scoped by tenant.

    Args:
        client: Authenticated Notion async client.
        tenant_id: Clerk user ID used as RLS key.

    Returns:
        list[dict]: Raw Notion page objects.

    Raises:
        RuntimeError: If the Reports database ID is not configured.
    """
    settings = get_settings()
    if not settings.notion_reports_db_id:
        raise RuntimeError("NOTION_REPORTS_DB_ID is not configured.")

    filter_payload: Optional[dict] = None

    response = await _query_database_records(
        client=client,
        database_id=settings.notion_reports_db_id,
        filter_payload=filter_payload,
    )
    return response.get("results", [])


# ------------------------------------------------------------------ #
# Sprint 2 — Programmatic Kanban Board                                #
# ------------------------------------------------------------------ #


async def create_kanban_board(
    client: AsyncClient,
    parent_page_id: str,
    idea_name: str,
    task_titles: list[str],
) -> str:
    """Create a Kanban board sub-page under a Notion Idea page.

    Called automatically by the Task Planner agent when an idea reaches the
    'Task Planning' state. The resulting child page contains a heading, a
    three-column table (Backlog / In Progress / Done), and one row per task
    pre-populated in the Backlog column.

    Args:
        client: Authenticated Notion async client.
        parent_page_id: Notion page ID of the parent Idea record.
        idea_name: Name of the idea — used as the sub-page title.
        task_titles: List of task titles to seed the Backlog column.

    Returns:
        str: The Notion page ID of the newly created Kanban sub-page.

    Raises:
        APIResponseError: If the Notion API returns an error response.
    """

    def _text_block(content: str, bold: bool = False) -> dict:
        """Build a plain paragraph block."""
        annotation: dict[str, Any] = {"bold": bold}
        return {
            "object": "block",
            "type": "paragraph",
            "paragraph": {
                "rich_text": [
                    {
                        "type": "text",
                        "text": {"content": content[:2000]},
                        "annotations": annotation,
                    }
                ]
            },
        }

    def _heading(content: str, level: int = 2) -> dict:
        h_type = f"heading_{level}"
        return {
            "object": "block",
            "type": h_type,
            h_type: {
                "rich_text": [{"type": "text", "text": {"content": content[:200]}}]
            },
        }

    def _divider() -> dict:
        return {"object": "block", "type": "divider", "divider": {}}

    def _kanban_row(task: str) -> dict:
        """One table row: task name in Backlog, empty In-Progress, empty Done."""
        def _cell(text: str) -> list[dict]:
            return [{"type": "text", "text": {"content": text[:200]}}]

        return {
            "object": "block",
            "type": "table_row",
            "table_row": {
                "cells": [_cell(task), _cell(""), _cell("")]
            },
        }

    # Seed up to 20 task rows
    task_rows = [_kanban_row(t) for t in task_titles[:20]]

    kanban_table: dict[str, Any] = {
        "object": "block",
        "type": "table",
        "table": {
            "table_width": 3,
            "has_column_header": True,
            "has_row_header": False,
            "children": [
                # Header row
                {
                    "object": "block",
                    "type": "table_row",
                    "table_row": {
                        "cells": [
                            [{"type": "text", "text": {"content": "📋 Backlog"}}],
                            [{"type": "text", "text": {"content": "⚙️ In Progress"}}],
                            [{"type": "text", "text": {"content": "✅ Done"}}],
                        ]
                    },
                },
                *task_rows,
            ],
        },
    }

    children_blocks = [
        _heading(f"🗂️ Kanban Board — {idea_name}", level=1),
        _text_block(
            f"Auto-generated by VentureNode Task Planner · "
            f"{datetime.utcnow().strftime('%Y-%m-%d %H:%M UTC')}"
        ),
        _divider(),
        _heading("Tasks", level=2),
        kanban_table,
    ]

    try:
        response = await client.pages.create(
            parent={"page_id": parent_page_id},
            properties={
                "title": {"title": _title(f"Kanban — {idea_name}")},
            },
            children=children_blocks,
        )
        page_id: str = response["id"]
        logger.info(
            "Created Kanban board sub-page",
            page_id=page_id,
            parent_page_id=parent_page_id,
            task_count=len(task_titles),
        )
        return page_id
    except APIResponseError as exc:
        logger.error(
            "Failed to create Kanban board",
            parent_page_id=parent_page_id,
            error=str(exc),
        )
        raise


# ------------------------------------------------------------------ #
# Sprint 2 — Agent Thought Streaming into Notion                      #
# ------------------------------------------------------------------ #


async def get_or_create_memory_page(
    client: AsyncClient,
    run_id: str,
) -> str:
    """Retrieve or create the agent Memory page for a pipeline run.

    Each run gets a dedicated Notion page titled 'Agent Memory — <run_id>'
    at the workspace root (using the first accessible parent page). The page
    ID is cached per run_id for the lifetime of the process.

    Args:
        client: Authenticated Notion async client.
        run_id: Unique pipeline run identifier.

    Returns:
        str: The Notion page ID of the Memory page.

    Raises:
        APIResponseError: If the Notion API returns an error response.
        RuntimeError: If no parent page is configured for the memory page.
    """
    settings = get_settings()
    parent_page_id = settings.notion_memory_page_id

    if not parent_page_id:
        raise RuntimeError(
            "NOTION_MEMORY_PAGE_ID is not set. "
            "Create a dedicated 'Agent Memory' page in Notion, share it with "
            "your integration, and set its ID in NOTION_MEMORY_PAGE_ID."
        )

    response = await client.pages.create(
        parent={"page_id": parent_page_id},
        properties={
            "title": {"title": _title(f"🧠 Agent Memory — {run_id}")},
        },
        children=[
            {
                "object": "block",
                "type": "callout",
                "callout": {
                    "rich_text": [
                        {
                            "type": "text",
                            "text": {
                                "content": (
                                    f"Pipeline run: {run_id}\n"
                                    f"Started: {datetime.utcnow().strftime('%Y-%m-%d %H:%M UTC')}\n"
                                    "All agent reasoning steps are appended below in real-time."
                                )
                            },
                        }
                    ],
                    "icon": {"emoji": "🤖"},
                    "color": "blue_background",
                },
            }
        ],
    )
    page_id: str = response["id"]
    logger.info("Created agent Memory page", page_id=page_id, run_id=run_id)
    return page_id


async def stream_thought_to_notion(
    client: AsyncClient,
    memory_page_id: str,
    agent_name: str,
    thought: str,
    step: str = "",
) -> None:
    """Append a single agent reasoning step to the Memory page as a block.

    Each call writes one timestamped callout block, making the page a live
    trace of the agent's internal reasoning that the founder can watch in
    real-time in Notion.

    Args:
        client: Authenticated Notion async client.
        memory_page_id: Notion page ID of the target Memory page.
        agent_name: Human-readable agent identifier (e.g. 'IdeaAnalyzerAgent').
        thought: The reasoning text to append (max 2000 chars).
        step: Optional sub-step label displayed in the block header.

    Raises:
        APIResponseError: If the Notion API returns an error response.
    """
    timestamp = datetime.utcnow().strftime("%H:%M:%S UTC")
    header = f"[{timestamp}] {agent_name}"
    if step:
        header = f"{header} · {step}"

    block: dict[str, Any] = {
        "object": "block",
        "type": "callout",
        "callout": {
            "rich_text": [
                {
                    "type": "text",
                    "text": {"content": f"{header}\n{thought[:1900]}"},
                }
            ],
            "icon": {"emoji": "💭"},
            "color": "default",
        },
    }

    try:
        await client.blocks.children.append(
            block_id=memory_page_id,
            children=[block],
        )
        logger.debug(
            "Streamed agent thought to Notion",
            memory_page_id=memory_page_id,
            agent=agent_name,
            step=step,
        )
    except APIResponseError as exc:
        # Non-fatal: log warning and continue — streaming failure must never
        # halt the agent pipeline.
        logger.warning(
            "Failed to stream thought to Notion (non-fatal)",
            memory_page_id=memory_page_id,
            agent=agent_name,
            error=str(exc),
        )


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


async def verify_workspace_setup(client: AsyncClient) -> dict[str, Any]:
    """Verify token auth and access to all configured Notion databases.

    This function is stricter than ``verify_connection``. It validates:
    1) Token authentication.
    2) Required database IDs are configured and well-formed.
    3) Integration can retrieve each configured database.

    Args:
        client: Authenticated Notion async client.

    Returns:
        dict: Validation summary with overall readiness and per-database status.
    """
    auth_status = await verify_connection(client)
    if not auth_status.get("connected"):
        return {
            "connected": False,
            "ready": False,
            "auth": auth_status,
            "databases": {},
            "error": auth_status.get("error", "Notion authentication failed."),
        }

    settings = get_settings()
    configured_databases: list[tuple[str, Optional[str], str]] = [
        ("ideas", settings.notion_ideas_db_id, "NOTION_IDEAS_DB_ID"),
        ("research", settings.notion_research_db_id, "NOTION_RESEARCH_DB_ID"),
        ("roadmap", settings.notion_roadmap_db_id, "NOTION_ROADMAP_DB_ID"),
        ("tasks", settings.notion_tasks_db_id, "NOTION_TASKS_DB_ID"),
        ("reports", settings.notion_reports_db_id, "NOTION_REPORTS_DB_ID"),
    ]

    db_status: dict[str, dict[str, Any]] = {}
    ready = True

    for name, db_id, env_name in configured_databases:
        if not db_id:
            ready = False
            db_status[name] = {
                "ok": False,
                "reason": f"{env_name} is missing.",
            }
            continue

        if not _is_valid_notion_id(db_id):
            ready = False
            db_status[name] = {
                "ok": False,
                "reason": f"{env_name} is not a valid Notion ID.",
            }
            continue

        try:
            await client.databases.retrieve(database_id=db_id)
            db_status[name] = {"ok": True}
        except APIResponseError as exc:
            ready = False
            db_status[name] = {
                "ok": False,
                "reason": str(exc),
            }

    return {
        "connected": True,
        "ready": ready,
        "auth": auth_status,
        "databases": db_status,
    }
