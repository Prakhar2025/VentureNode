"""
VentureNode — Task Planner Agent (Sprint 2 Enhanced).

The fourth node in the VentureNode pipeline. Decomposes each roadmap
milestone into granular, actionable execution tasks. Each task is
linked back to its parent roadmap item via a Notion Relation property,
creating a fully navigable, relational workspace.

Sprint 2 Additions:
  - Streams agent reasoning to the Notion Memory page at each step.
  - Automatically creates a Kanban board sub-page under the Idea page
    once all tasks have been generated, seeding the Backlog column with
    every task title.

Responsibilities:
  1. For each roadmap item, generate 2–4 specific execution tasks.
  2. Assign realistic deadlines and priority levels to each task.
  3. Write tasks to the Notion 'Tasks' database.
  4. Link each task to its parent Roadmap page via Notion Relation.
  5. Create a Kanban board child page under the Idea Notion page.
  6. Stream all reasoning steps to the Notion Memory page.
  7. Return task_page_ids, kanban_page_id, and memory_page_id to AgentState.
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
from backend.notion.mcp_client import (
    create_kanban_board,
    create_task,
    get_notion_client,
    get_or_create_memory_page,
    stream_thought_to_notion,
)
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
    memory_page_id: str,
) -> list[str]:
    """Generate and persist tasks for a single roadmap item.

    Streams a reasoning callout to the Notion Memory page before and after
    the LLM call so the founder can observe agent thinking in real-time.

    Args:
        item: The roadmap milestone to decompose.
        roadmap_page_id: The Notion page ID of the parent roadmap item.
        client: Authenticated Notion async client.
        llm: Configured LangChain LLM instance.
        memory_page_id: Notion Memory page to stream reasoning into.

    Returns:
        list[str]: List of Notion task page IDs created.
    """
    await stream_thought_to_notion(
        client=client,
        memory_page_id=memory_page_id,
        agent_name=_AGENT_NAME,
        thought=(
            f"Starting task decomposition for milestone: '{item.feature_name}'\n"
            f"Phase {item.phase} · Priority: {item.priority}\n"
            f"Description: {item.description}"
        ),
        step=f"decomposing — {item.feature_name}",
    )

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

    task_summary_lines = "\n".join(
        f"  [{t.priority}] {t.task_title} (due in {t.deadline_days}d)"
        for t in plan.tasks
    )
    await stream_thought_to_notion(
        client=client,
        memory_page_id=memory_page_id,
        agent_name=_AGENT_NAME,
        thought=(
            f"Generated {len(plan.tasks)} tasks for '{item.feature_name}':\n"
            f"{task_summary_lines}\n"
            f"Writing to Notion Tasks database..."
        ),
        step=f"writing tasks — {item.feature_name}",
    )

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
    """LangGraph node: decompose roadmap into tasks, write to Notion, create Kanban board.

    Sprint 2 behaviour:
      1. Creates a Notion Memory page for this run (or reuses one from state).
      2. For each roadmap item, generates 2–4 tasks with live reasoning streaming.
      3. After all tasks are written, creates a Kanban board sub-page attached
         to the Idea Notion page with all task titles seeded in the Backlog column.

    Args:
        state: The current LangGraph AgentState.

    Returns:
        dict: Partial state update with task_page_ids, kanban_page_id,
              memory_page_id, and current_step. On failure, returns error state.
    """
    run_id: str = state.get("run_id", "unknown")
    roadmap_items_raw: list[dict] = state.get("roadmap_items", [])
    roadmap_page_ids: list[str] = state.get("roadmap_page_ids", [])
    idea_page_id: str = state.get("idea_page_id", "")
    idea_analysis: dict = state.get("idea_analysis", {})
    idea_name: str = idea_analysis.get("idea_name", "Startup Idea") if idea_analysis else "Startup Idea"

    log_agent_start(_AGENT_NAME, run_id, roadmap_items=len(roadmap_items_raw))

    try:
        roadmap_items = [RoadmapItem.model_validate(r) for r in roadmap_items_raw]
        llm = get_llm(temperature_override=0.1)
        client = get_notion_client()

        # ---- Step 1: Initialise / reuse Memory page ----------------- #
        memory_page_id: str = state.get("memory_page_id", "")
        if not memory_page_id:
            try:
                memory_page_id = await get_or_create_memory_page(
                    client=client,
                    run_id=run_id,
                )
            except RuntimeError:
                # NOTION_MEMORY_PAGE_ID not set — degrade gracefully,
                # streaming will be silently no-op via a sentinel value.
                memory_page_id = ""

        if memory_page_id:
            await stream_thought_to_notion(
                client=client,
                memory_page_id=memory_page_id,
                agent_name=_AGENT_NAME,
                thought=(
                    f"Task Planner starting for run_id={run_id}\n"
                    f"Idea: '{idea_name}'\n"
                    f"Processing {len(roadmap_items)} roadmap milestones."
                ),
                step="initializing",
            )

        # ---- Step 2: Generate tasks per roadmap item ----------------- #
        all_task_titles: list[str] = []
        all_task_page_ids: list[str] = []

        for item, roadmap_page_id in zip(roadmap_items, roadmap_page_ids):
            task_page_ids = await _generate_tasks_for_item(
                item=item,
                roadmap_page_id=roadmap_page_id,
                client=client,
                llm=llm,
                memory_page_id=memory_page_id,
            )
            all_task_page_ids.extend(task_page_ids)
            all_task_titles.append(item.feature_name)

        # ---- Step 3: Create Kanban board sub-page -------------------- #
        kanban_page_id: str = ""
        if idea_page_id:
            if memory_page_id:
                await stream_thought_to_notion(
                    client=client,
                    memory_page_id=memory_page_id,
                    agent_name=_AGENT_NAME,
                    thought=(
                        f"All {len(all_task_page_ids)} tasks written to Notion.\n"
                        f"Creating Kanban board sub-page under Idea page {idea_page_id}..."
                    ),
                    step="creating Kanban board",
                )

            kanban_page_id = await create_kanban_board(
                client=client,
                parent_page_id=idea_page_id,
                idea_name=idea_name,
                task_titles=all_task_titles,
            )

            if memory_page_id:
                await stream_thought_to_notion(
                    client=client,
                    memory_page_id=memory_page_id,
                    agent_name=_AGENT_NAME,
                    thought=(
                        f"Kanban board created at:\n"
                        f"https://notion.so/{kanban_page_id.replace('-', '')}\n"
                        f"Task Planner complete. Handing off to Execution Monitor."
                    ),
                    step="complete",
                )

        log_agent_complete(
            _AGENT_NAME,
            run_id,
            total_tasks=len(all_task_page_ids),
            roadmap_items_processed=len(roadmap_items),
            kanban_created=bool(kanban_page_id),
        )

        return {
            "task_page_ids": all_task_page_ids,
            "kanban_page_id": kanban_page_id or None,
            "memory_page_id": memory_page_id or None,
            "current_step": "task_planning_complete",
            "error": None,
        }

    except Exception as exc:
        return capture_error(state, _AGENT_NAME, exc)
