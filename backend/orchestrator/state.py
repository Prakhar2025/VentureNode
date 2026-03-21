"""
VentureNode — Agent State & Pydantic Output Schemas.

This module defines the canonical data contract for the entire
VentureNode multi-agent pipeline:
  - AgentState: The single mutable state object passed between all
    LangGraph nodes. Every agent reads from and writes to this dict.
  - Pydantic models: Structured output schemas for each agent's LLM
    call, ensuring type-safe, validated data before it reaches Notion.
"""

from __future__ import annotations

from datetime import datetime, timedelta
from typing import Any, Optional

from pydantic import BaseModel, Field, field_validator
from typing_extensions import TypedDict


# ================================================================== #
# Pydantic Output Schemas (LLM Structured Output Contracts)          #
# ================================================================== #


class IdeaAnalysis(BaseModel):
    """Structured output of the Idea Analyzer Agent.

    Every field is required — the LLM must produce all values.
    Numeric scores are validated to stay within the 1–10 range.
    """

    idea_name: str = Field(
        ...,
        description="A concise, memorable name for the startup idea (5 words max).",
    )
    unique_value_proposition: str = Field(
        ...,
        description="One sentence describing what makes this idea uniquely valuable.",
    )
    market_hypothesis: str = Field(
        ...,
        description=(
            "A falsifiable hypothesis about the target market. "
            "Format: 'We believe [customer] will [action] because [reason]'."
        ),
    )
    opportunity_score: float = Field(
        ...,
        ge=1.0,
        le=10.0,
        description="Market opportunity score from 1 (low) to 10 (high).",
    )
    risk_score: float = Field(
        ...,
        ge=1.0,
        le=10.0,
        description="Execution risk score from 1 (low risk) to 10 (very high risk).",
    )
    key_risks: list[str] = Field(
        ...,
        min_length=2,
        max_length=5,
        description="List of 2–5 concrete execution risks for this idea.",
    )
    target_customer: str = Field(
        ...,
        description="Specific description of the primary target customer segment.",
    )
    monetization_model: str = Field(
        ...,
        description="Proposed revenue model (e.g. SaaS subscription, marketplace fee).",
    )

    @field_validator("opportunity_score", "risk_score", mode="before")
    @classmethod
    def round_score(cls, v: Any) -> float:
        """Round score to one decimal place for clean Notion display."""
        return round(float(v), 1)


class CompetitorInsight(BaseModel):
    """Structured representation of a single competitor or market player."""

    name: str = Field(..., description="Competitor or product name.")
    description: str = Field(..., description="One-sentence description of what they do.")
    weakness: str = Field(..., description="A key gap or weakness in their offering.")
    source_url: str = Field(..., description="URL of the source used for this analysis.")


class ResearchSummary(BaseModel):
    """Structured output of the Market Research Agent."""

    market_size_estimate: str = Field(
        ...,
        description="Estimated total addressable market size (e.g. '$4.2B by 2027').",
    )
    key_competitors: list[CompetitorInsight] = Field(
        default_factory=list,
        max_length=6,
        description="Up to 6 key competitors or adjacent market players. Return an empty list if none found.",
    )
    market_trends: list[str] = Field(
        default_factory=list,
        max_length=5,
        description="Up to 5 relevant macro or industry trends.",
    )
    opportunity_gaps: list[str] = Field(
        default_factory=list,
        max_length=4,
        description="Up to 4 unserved needs or whitespace opportunities in the market.",
    )
    overall_verdict: str = Field(
        ...,
        description=(
            "A concise executive summary of the market landscape "
            "and the idea's position within it."
        ),
    )


class RoadmapItem(BaseModel):
    """A single product milestone within the roadmap."""

    feature_name: str = Field(..., description="Short, action-oriented feature name.")
    description: str = Field(..., description="What this feature does and why it matters.")
    priority: str = Field(
        ...,
        pattern="^(High|Medium|Low)$",
        description="Priority level: High, Medium, or Low.",
    )
    phase: int = Field(
        ...,
        ge=1,
        le=3,
        description="Development phase: 1 (MVP), 2 (Growth), or 3 (Scale).",
    )


class RoadmapPlan(BaseModel):
    """Structured output of the Roadmap Generator Agent."""

    items: list[RoadmapItem] = Field(
        ...,
        min_length=4,
        max_length=12,
        description="4–12 product roadmap milestones across 3 phases.",
    )
    rationale: str = Field(
        ...,
        description="Explanation of the sequencing and prioritization logic.",
    )


class TaskItem(BaseModel):
    """A single granular execution task derived from a roadmap milestone."""

    task_title: str = Field(..., description="Short, actionable task title (verb-first).")
    description: str = Field(..., description="Detailed explanation of what must be done.")
    priority: str = Field(
        ...,
        pattern="^(P0|P1|P2)$",
        description="P0=critical, P1=high, P2=normal.",
    )
    deadline_days: int = Field(
        ...,
        ge=1,
        le=90,
        description="Number of days from today to complete this task.",
    )
    assigned_agent: str = Field(
        default="Human",
        description="Who should complete this task (Human, AI Agent, etc.).",
    )


class TaskPlan(BaseModel):
    """Structured output of the Task Planner Agent."""

    tasks: list[TaskItem] = Field(
        ...,
        min_length=3,
        max_length=20,
        description="3–20 execution tasks derived from the roadmap.",
    )


class ExecutionReport(BaseModel):
    """Structured output of the Execution Monitor Agent."""

    report_title: str = Field(..., description="Descriptive report title.")
    completion_percentage: float = Field(
        ...,
        ge=0.0,
        le=100.0,
        description="Percentage of tasks marked Done.",
    )
    summary: str = Field(..., description="Narrative summary of progress this period.")
    insights: str = Field(..., description="Key patterns and observations from the data.")
    recommendations: str = Field(
        ...,
        description="Concrete next-step recommendations for the founder.",
    )


# ================================================================== #
# LangGraph Agent State                                               #
# ================================================================== #


class AgentState(TypedDict, total=False):
    """The single shared state object for the VentureNode LangGraph pipeline.

    This TypedDict is passed between every agent node. Each node reads
    the fields it needs and returns a partial dict of only the keys it
    modifies — LangGraph merges these partials into the running state.

    All fields are optional (total=False) because each node only
    populates the subset it is responsible for.
    """

    # ---- Run Metadata -------------------------------------------- #
    run_id: str
    current_step: str
    error: Optional[str]

    # ---- Input --------------------------------------------------- #
    idea_text: str

    # ---- Idea Analyzer Output ------------------------------------ #
    idea_page_id: Optional[str]
    idea_analysis: Optional[dict[str, Any]]  # Serialized IdeaAnalysis

    # ---- Human-in-the-Loop Checkpoints --------------------------- #
    human_approved_idea: bool
    human_approved_research: bool

    # ---- Market Research Output ---------------------------------- #
    research_page_ids: Optional[list[str]]
    research_summary: Optional[str]  # Serialized for LLM context

    # ---- Roadmap Generator Output -------------------------------- #
    roadmap_page_ids: Optional[list[str]]
    roadmap_items: Optional[list[dict[str, Any]]]  # Serialized RoadmapItems

    # ---- Task Planner Output ------------------------------------- #
    task_page_ids: Optional[list[str]]
    kanban_page_id: Optional[str]   # Notion Kanban sub-page under the Idea page

    # ---- Agent Memory (Streaming Reasoning) ---------------------- #
    memory_page_id: Optional[str]   # Notion Memory page for this run

    # ---- Execution Monitor Output -------------------------------- #
    report_page_id: Optional[str]


def deadline_iso(days: int) -> str:
    """Compute an ISO 8601 date string N days from today.

    Args:
        days: Number of days from today.

    Returns:
        str: ISO 8601 date string (YYYY-MM-DD).
    """
    return (datetime.utcnow() + timedelta(days=days)).date().isoformat()
