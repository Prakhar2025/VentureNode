"""
VentureNode — Execution Monitor Agent.

The fifth and final node in the primary VentureNode pipeline. Operates
as a periodic review engine — it reads the current state of all Tasks
from Notion, computes execution metrics, identifies bottlenecks, and
generates an executive report via Groq.

This agent can be triggered:
  1. At the end of the initial workflow (post-task-creation).
  2. On-demand via the POST /monitor/report API endpoint.
  3. On a scheduled CRON basis (handled by the scheduler, not this module).

Responsibilities:
  1. Fetch all tasks from the Notion Tasks database.
  2. Compute completion %, overdue tasks, and status distribution.
  3. Synthesize observations into a structured ExecutionReport via Groq.
  4. Write the report to the Notion 'Reports' database.
  5. Return the report page ID to AgentState.
"""

from __future__ import annotations

from datetime import datetime
from typing import Any

from langchain_core.prompts import ChatPromptTemplate

from backend.agents.base import (
    capture_error,
    get_llm,
    log_agent_complete,
    log_agent_start,
)
from backend.notion.mcp_client import create_report, get_notion_client, get_tasks
from backend.orchestrator.state import AgentState, ExecutionReport

_AGENT_NAME = "ExecutionMonitorAgent"

_SYSTEM_PROMPT = """\
You are an experienced Chief of Staff and operations executive. You receive
a structured summary of a startup's task execution data and produce a concise,
honest, and actionable performance report.

Report writing rules:
  - Be honest about underperformance. Do not sugarcoat delays.
  - Bottlenecks must be specific — name the actual blocked task or area.
  - Recommendations must be concrete actions (e.g. "Reassign X to Y by Z date").
  - The executive summary should be readable in under 60 seconds.
"""

_HUMAN_PROMPT = """\
Execution Data Summary:
{execution_data}

Generate a clear, actionable executive progress report.
"""


def _extract_task_metrics(tasks: list[dict]) -> dict[str, Any]:
    """Parse raw Notion task pages and compute execution metrics.

    Args:
        tasks: List of raw Notion page objects from the Tasks database.

    Returns:
        dict: Computed metrics including completion rate, status counts,
              and list of overdue and blocked tasks.
    """
    today = datetime.utcnow().date()

    status_counts: dict[str, int] = {
        "Backlog": 0,
        "In Progress": 0,
        "Blocked": 0,
        "Done": 0,
    }
    overdue_tasks: list[str] = []
    blocked_tasks: list[str] = []

    for page in tasks:
        props = page.get("properties", {})

        # Extract status
        status_prop = props.get("Status", {}).get("select")
        status = status_prop.get("name", "Backlog") if status_prop else "Backlog"
        status_counts[status] = status_counts.get(status, 0) + 1

        # Extract task title
        title_parts = props.get("Task Title", {}).get("title", [])
        title = title_parts[0].get("text", {}).get("content", "Untitled") if title_parts else "Untitled"

        # Check for overdue (has deadline, not Done)
        deadline_prop = props.get("Deadline", {}).get("date")
        if deadline_prop and status != "Done":
            deadline_str = deadline_prop.get("start", "")
            if deadline_str:
                try:
                    deadline_date = datetime.fromisoformat(deadline_str).date()
                    if deadline_date < today:
                        overdue_tasks.append(f"{title} (deadline: {deadline_str})")
                except ValueError:
                    pass

        if status == "Blocked":
            blocked_tasks.append(title)

    total = sum(status_counts.values())
    done = status_counts.get("Done", 0)
    completion_pct = round((done / total * 100) if total > 0 else 0.0, 1)

    return {
        "total_tasks": total,
        "completion_percentage": completion_pct,
        "status_counts": status_counts,
        "overdue_tasks": overdue_tasks,
        "blocked_tasks": blocked_tasks,
    }


def _format_execution_data(metrics: dict[str, Any]) -> str:
    """Format computed task metrics into a text block for the LLM.

    Args:
        metrics: Dict of execution metrics from _extract_task_metrics.

    Returns:
        str: Human-readable formatted metrics text.
    """
    sc = metrics["status_counts"]
    return (
        f"Total Tasks: {metrics['total_tasks']}\n"
        f"Completion: {metrics['completion_percentage']}%\n"
        f"Status Breakdown: Done={sc.get('Done', 0)}, "
        f"In Progress={sc.get('In Progress', 0)}, "
        f"Blocked={sc.get('Blocked', 0)}, "
        f"Backlog={sc.get('Backlog', 0)}\n"
        f"Overdue Tasks ({len(metrics['overdue_tasks'])}): "
        f"{'; '.join(metrics['overdue_tasks'][:5]) or 'None'}\n"
        f"Blocked Tasks ({len(metrics['blocked_tasks'])}): "
        f"{'; '.join(metrics['blocked_tasks'][:5]) or 'None'}"
    )


async def exec_monitor_node(state: AgentState) -> dict[str, Any]:
    """LangGraph node: analyze task execution and generate Notion report.

    Fetches all tasks from Notion, computes metrics, synthesizes
    an executive report with Groq, and writes to the Reports database.

    Args:
        state: The current LangGraph AgentState.

    Returns:
        dict: Partial state update with report_page_id and current_step.
              On failure, returns error state.
    """
    run_id: str = state.get("run_id", "unknown")
    log_agent_start(_AGENT_NAME, run_id)

    try:
        client = get_notion_client()

        # ---- 1. Fetch all tasks from Notion -------------------------- #
        tasks = await get_tasks(client)
        metrics = _extract_task_metrics(tasks)

        # ---- 2. Synthesize report with Groq -------------------------- #
        llm = get_llm(temperature_override=0.2)
        structured_llm = llm.with_structured_output(ExecutionReport)

        prompt = ChatPromptTemplate.from_messages([
            ("system", _SYSTEM_PROMPT),
            ("human", _HUMAN_PROMPT),
        ])

        chain = prompt | structured_llm
        report: ExecutionReport = await chain.ainvoke({
            "execution_data": _format_execution_data(metrics),
        })

        # ---- 3. Write report to Notion Reports database -------------- #
        report_page_id = await create_report(
            client=client,
            title=report.report_title,
            summary=f"Completion: {metrics['completion_percentage']}%\n\n{report.summary}",
            insights=report.insights,
            recommendations=report.recommendations,
        )

        log_agent_complete(
            _AGENT_NAME,
            run_id,
            report_page_id=report_page_id,
            completion_pct=metrics["completion_percentage"],
            total_tasks=metrics["total_tasks"],
        )

        return {
            "report_page_id": report_page_id,
            "current_step": "pipeline_complete",
            "error": None,
        }

    except Exception as exc:
        return capture_error(state, _AGENT_NAME, exc)
