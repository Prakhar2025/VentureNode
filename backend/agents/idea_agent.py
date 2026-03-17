"""
VentureNode — Idea Analyzer Agent.

The first node in the VentureNode LangGraph pipeline. Accepts a raw
startup idea as text and produces a structured, scored analysis using
Groq's Llama-3.3-70b model with enforced JSON output.

Responsibilities:
  1. Parse and evaluate the startup idea using a multi-dimensional prompt.
  2. Produce a validated IdeaAnalysis Pydantic object.
  3. Write the analysis to the Notion 'Ideas' database.
  4. Return the Notion page ID and serialized analysis to AgentState.
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
from backend.notion.mcp_client import create_idea, get_notion_client
from backend.orchestrator.state import AgentState, IdeaAnalysis

_AGENT_NAME = "IdeaAnalyzerAgent"

_SYSTEM_PROMPT = """\
You are a world-class startup analyst with deep expertise in market analysis,
product strategy, and venture capital due diligence. Your analysis is trusted
by top-tier investors and founders.

Your task is to perform a rigorous, evidence-based analysis of a startup idea.
Be intellectually honest — penalize vague ideas and reward specific, validated
concepts. Do not be overly optimistic.

Scoring rubric:
- Opportunity Score: Consider market size, timing, founder-market fit potential,
  and uniqueness of the insight. Score 1–10.
- Risk Score: Consider technical complexity, regulatory exposure, competition
  intensity, and execution difficulty. Score 1–10 (10 = very risky).
"""

_HUMAN_PROMPT = """\
Analyze the following startup idea and return your assessment:

IDEA: {idea_text}

Be brutally honest. Identify real risks. Base your market hypothesis on
observable evidence, not wishful thinking.
"""


async def idea_analyzer_node(state: AgentState) -> dict[str, Any]:
    """LangGraph node: analyze a startup idea with Groq and write to Notion.

    This node:
      1. Invokes Groq Llama-3.3-70b with structured output enforcement.
      2. Creates a page in the Notion Ideas database with all scored fields.
      3. Stores the analysis in AgentState for downstream agents.

    Args:
        state: The current LangGraph AgentState.

    Returns:
        dict: Partial state update with idea_page_id, idea_analysis, and
              current_step. On failure, returns error state.
    """
    run_id: str = state.get("run_id", "unknown")
    idea_text: str = state.get("idea_text", "")

    log_agent_start(_AGENT_NAME, run_id, idea_preview=idea_text[:80])

    try:
        # ---- 1. Build structured LLM chain -------------------------- #
        llm = get_llm(temperature_override=0.1)
        structured_llm = llm.with_structured_output(IdeaAnalysis)

        prompt = ChatPromptTemplate.from_messages([
            ("system", _SYSTEM_PROMPT),
            ("human", _HUMAN_PROMPT),
        ])

        chain = prompt | structured_llm
        analysis: IdeaAnalysis = await chain.ainvoke({"idea_text": idea_text})

        # ---- 2. Write to Notion Ideas database ----------------------- #
        client = get_notion_client()
        page_id = await create_idea(
            client=client,
            idea_name=analysis.idea_name,
            description=(
                f"UVP: {analysis.unique_value_proposition}\n\n"
                f"Market Hypothesis: {analysis.market_hypothesis}\n\n"
                f"Target Customer: {analysis.target_customer}\n\n"
                f"Monetization: {analysis.monetization_model}\n\n"
                f"Key Risks:\n" + "\n".join(f"• {r}" for r in analysis.key_risks)
            ),
            opportunity_score=analysis.opportunity_score,
            risk_score=analysis.risk_score,
        )

        log_agent_complete(
            _AGENT_NAME,
            run_id,
            page_id=page_id,
            opportunity_score=analysis.opportunity_score,
            risk_score=analysis.risk_score,
        )

        return {
            "idea_page_id": page_id,
            "idea_analysis": analysis.model_dump(),
            "current_step": "idea_analysis_complete",
            "human_approved_idea": False,
            "error": None,
        }

    except Exception as exc:
        return capture_error(state, _AGENT_NAME, exc)
