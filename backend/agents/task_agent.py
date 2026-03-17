"""
VentureNode — Task Planner Agent.

The fourth node in the VentureNode pipeline. Decomposes each roadmap
milestone into granular, actionable execution tasks. Each task is
linked back to its parent roadmap item via a Notion Relation property,
creating a fully navigable, relational workspace.

Responsibilities:
  1. For each roadmap item, generate 2–4 specific execution tasks.
  2. Assign realistic deadlines and priority levels to each task.
  3. Write tasks to the Notion 'Tasks' database.
  4. Link each task to its parent Roadmap page via Notion Relation.
  5. Return all task page IDs to AgentState.
"""

from __future__ import annotations

from typing import Any

from langchain_core.prompts import ChatPromptTemplate

from backend.agents.base import (
    capture_error,
    get_llm,
    log_agent_complete,
    log_agent_start,
)
from backend.notion.mcp_client import create_task, get_notion_client
from backend.orchestrator.state import AgentState, RoadmapItem, TaskPlan, deadline_iso

_AGENT_NAME = "TaskPlannerAgent"

_SYSTEM_PROMPT = """\
You are an experienced engineering manager and product lead. You excel at
breaking down high-level product milestones into precise, actionable tasks
that an engineering team can immediately begin executing.

Task writing rules:
  - Each task title must start with an action verb (Build, Design, Implement,
    Configure, Write, Test, Deploy, Research, Define, etc.)
  - Descriptions must be specific — include what tools, APIs, or methods to use.
  - Deadlines must be realistic: P0 tasks ≤ 7 days, P1 ≤ 21 days, P2 ≤ 45 days.
  - P0 = must ship to unblock everything else. 
  - P1 = important, do after P0 tasks.
  - P2 = valuable but not blocking.
  - Generate exactly 2–4 tasks per milestone. No more.
"""

_HUMAN_PROMPT = """\
Product Milestone: {feature_name}
Description: {feature_description}
Priority Level of milestone: {priority}
Development Phase: {phase}

Generate specific, immediately actionable tasks to deliver this milestone.
"""


async def _generate_tasks_for_item(
    item: RoadmapItem,
    roadmap_page_id: str,
    client: Any,
    llm: Any,
) -> list[str]:
    """Generate and persist tasks for a single roadmap item.

    Args:
        item: The roadmap milestone to decompose.
        roadmap_page_id: The Notion page ID of the parent roadmap item.
        client: Authenticated Notion async client.
        llm: Configured LangChain LLM instance.

    Returns:
        list[str]: List of Notion task page IDs created.
    """
    structured_llm = llm.with_structured_output(TaskPlan)
    prompt = ChatPromptTemplate.from_messages([
        ("system", _SYSTEM_PROMPT),
        ("human", _HUMAN_PROMPT),
    ])
    chain = prompt | structured_llm

    plan: TaskPlan = await chain.ainvoke({
        "feature_name": item.feature_name,
        "feature_description": item.description,
        "priority": item.priority,
        "phase": item.phase,
    })

    page_ids: list[str] = []
    for task in plan.tasks:
        page_id = await create_task(
            client=client,
            task_title=task.task_title,
            description=task.description,
            priority=task.priority,
            deadline=deadline_iso(task.deadline_days),
            assigned_agent=task.assigned_agent,
            related_feature_id=roadmap_page_id,
        )
        page_ids.append(page_id)

    return page_ids


async def task_planner_node(state: AgentState) -> dict[str, Any]:
    """LangGraph node: decompose roadmap into tasks and write to Notion.

    Iterates over each roadmap item in AgentState and generates 2–4
    specific tasks per milestone. Each task is Notion-linked to its
    parent roadmap page via the Relation property.

    Args:
        state: The current LangGraph AgentState.

    Returns:
        dict: Partial state update with task_page_ids and current_step.
              On failure, returns error state.
    """
    run_id: str = state.get("run_id", "unknown")
    roadmap_items_raw: list[dict] = state.get("roadmap_items", [])
    roadmap_page_ids: list[str] = state.get("roadmap_page_ids", [])

    log_agent_start(_AGENT_NAME, run_id, roadmap_items=len(roadmap_items_raw))

    try:
        roadmap_items = [RoadmapItem.model_validate(r) for r in roadmap_items_raw]
        llm = get_llm(temperature_override=0.1)
        client = get_notion_client()

        all_task_page_ids: list[str] = []

        # Process each roadmap item with its corresponding Notion page ID
        for item, roadmap_page_id in zip(roadmap_items, roadmap_page_ids):
            task_page_ids = await _generate_tasks_for_item(
                item=item,
                roadmap_page_id=roadmap_page_id,
                client=client,
                llm=llm,
            )
            all_task_page_ids.extend(task_page_ids)

        log_agent_complete(
            _AGENT_NAME,
            run_id,
            total_tasks=len(all_task_page_ids),
            roadmap_items_processed=len(roadmap_items),
        )

        return {
            "task_page_ids": all_task_page_ids,
            "current_step": "task_planning_complete",
            "error": None,
        }

    except Exception as exc:
        return capture_error(state, _AGENT_NAME, exc)
