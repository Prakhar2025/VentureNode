"""
VentureNode — Roadmap Generator Agent.

The third node in the VentureNode pipeline. Consumes the idea analysis
and market research summary to produce a structured, 3-phase product
roadmap using Groq. Each milestone is sequenced by strategic priority
and grounded in the competitive landscape.

Responsibilities:
  1. Synthesize idea analysis + research summary into a prioritized roadmap.
  2. Produce a validated RoadmapPlan Pydantic object (4–12 milestones).
  3. Write each roadmap item to the Notion 'Roadmap' database.
  4. Return page IDs and serialized items to AgentState.
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
from backend.notion.mcp_client import create_roadmap_item, get_notion_client
from backend.orchestrator.state import AgentState, IdeaAnalysis, RoadmapItem, RoadmapPlan

_AGENT_NAME = "RoadmapGeneratorAgent"

_SYSTEM_PROMPT = """\
You are a senior product strategist and CTO with experience building
multiple successful startups from zero to scale.

Your task is to design a realistic, strategically sequenced product roadmap
for a startup idea. The roadmap must have exactly three development phases:
  - Phase 1 (MVP): The minimum viable product to validate the core hypothesis.
    Focus on the single most critical feature that proves the value proposition.
  - Phase 2 (Growth): Features that accelerate adoption, retention, and revenue.
    Build on the validated MVP with market-driven priorities.
  - Phase 3 (Scale): Infrastructure, integrations, and expansion features for
    a mature product targeting a larger customer base.

Rules:
  - Each feature name must be verb-first and action-oriented (e.g. 'Build X', 'Implement Y').
  - Phase 1 should have at most 3 items. Phase 2: 3–5 items. Phase 3: 2–4 items.
  - Prioritize based on customer impact and strategic risk reduction.
  - The rationale must explain the overall sequencing logic in 2–3 sentences.
"""

_HUMAN_PROMPT = """\
Startup Idea Analysis:
{idea_analysis}

Market Research Summary:
{research_summary}

Design a complete 3-phase product roadmap for this startup.
"""


def _format_analysis(analysis_dict: dict) -> str:
    """Format the idea analysis dict into a readable text block for the LLM.

    Args:
        analysis_dict: Serialized IdeaAnalysis dict from AgentState.

    Returns:
        str: Human-readable formatted analysis text.
    """
    a = IdeaAnalysis.model_validate(analysis_dict)
    return (
        f"Idea: {a.idea_name}\n"
        f"UVP: {a.unique_value_proposition}\n"
        f"Target Customer: {a.target_customer}\n"
        f"Monetization: {a.monetization_model}\n"
        f"Opportunity Score: {a.opportunity_score}/10\n"
        f"Risk Score: {a.risk_score}/10\n"
        f"Key Risks: {'; '.join(a.key_risks)}"
    )


async def roadmap_generator_node(state: AgentState) -> dict[str, Any]:
    """LangGraph node: generate a 3-phase product roadmap and write to Notion.

    Args:
        state: The current LangGraph AgentState.

    Returns:
        dict: Partial state update with roadmap_page_ids, roadmap_items,
              and current_step. On failure, returns error state.
    """
    run_id: str = state.get("run_id", "unknown")
    idea_analysis_dict: dict = state.get("idea_analysis", {})
    research_summary: str = state.get("research_summary", "No research available.")

    log_agent_start(_AGENT_NAME, run_id)

    try:
        analysis_text = _format_analysis(idea_analysis_dict)

        # ---- 1. Generate roadmap with Groq structured output --------- #
        llm = get_llm(temperature_override=0.2)
        structured_llm = llm.with_structured_output(RoadmapPlan)

        prompt = ChatPromptTemplate.from_messages([
            ("system", _SYSTEM_PROMPT),
            ("human", _HUMAN_PROMPT),
        ])

        chain = prompt | structured_llm
        roadmap: RoadmapPlan = await chain.ainvoke({
            "idea_analysis": analysis_text,
            "research_summary": research_summary,
        })

        # ---- 2. Write each item to Notion Roadmap DB ----------------- #
        client = get_notion_client()
        page_ids: list[str] = []

        for item in roadmap.items:
            page_id = await create_roadmap_item(
                client=client,
                feature_name=item.feature_name,
                priority=item.priority,
                phase=item.phase,
                owner="VentureNode AI",
            )
            page_ids.append(page_id)

        log_agent_complete(
            _AGENT_NAME,
            run_id,
            roadmap_items=len(page_ids),
            phases={1: sum(1 for i in roadmap.items if i.phase == 1),
                    2: sum(1 for i in roadmap.items if i.phase == 2),
                    3: sum(1 for i in roadmap.items if i.phase == 3)},
        )

        return {
            "roadmap_page_ids": page_ids,
            "roadmap_items": [item.model_dump() for item in roadmap.items],
            "current_step": "roadmap_complete",
            "error": None,
        }

    except Exception as exc:
        return capture_error(state, _AGENT_NAME, exc)
