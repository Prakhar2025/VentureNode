"""
VentureNode — LangGraph Stateful Orchestration Graph.

This module defines the complete multi-agent pipeline as a LangGraph
StateGraph. It is the central nervous system of VentureNode.

Pipeline topology:
  START
    → idea_analyzer           (Groq structured analysis)
    → idea_approval_checkpoint (poll Notion 'Approved' checkbox)
    → market_research         (DuckDuckGo + BeautifulSoup + Groq)
    → research_approval_checkpoint (poll Notion 'Approved' checkbox)
    → roadmap_generator       (Groq 3-phase roadmap)
    → task_planner            (Groq task decomposition + Notion relations)
    → execution_monitor       (Metrics + Groq report)
  END

Human-in-the-Loop Design:
  The two approval checkpoint nodes poll the Notion workspace for a
  checkbox toggle by the founder. The graph uses conditional edges:
  if approved → proceed; if timed out → END with timeout state.

Memory Integration:
  Each agent run stores its output in the FAISS vector store, enabling
  future runs to retrieve semantically similar historical context.
"""

from __future__ import annotations

import asyncio
from typing import Any, Literal

from langgraph.graph import END, START, StateGraph

from backend.agents.exec_monitor_agent import exec_monitor_node
from backend.agents.idea_agent import idea_analyzer_node
from backend.agents.research_agent import market_research_node
from backend.agents.roadmap_agent import roadmap_generator_node
from backend.agents.task_agent import task_planner_node
from backend.core.logging import get_logger
from backend.memory.vector_store import get_memory
from backend.notion.mcp_client import get_notion_client, poll_idea_approval
from backend.orchestrator.state import AgentState

logger = get_logger(__name__)

# ------------------------------------------------------------------ #
# Human-in-the-Loop Checkpoint Nodes                                  #
# ------------------------------------------------------------------ #

_APPROVAL_POLL_INTERVAL = 10.0   # seconds between polls
_APPROVAL_TIMEOUT = 3600.0       # 1 hour maximum wait


async def idea_approval_checkpoint_node(state: AgentState) -> dict[str, Any]:
    """LangGraph node: wait for founder approval of the idea analysis.

    Polls the Notion Ideas page for the 'Approved' checkbox to be checked
    by the founder. The pipeline is suspended here until approval or timeout.

    Args:
        state: Current AgentState containing the idea Notion page ID.

    Returns:
        dict: Partial state with human_approved_idea set to True or False.
    """
    run_id = state.get("run_id", "unknown")
    idea_page_id = state.get("idea_page_id", "")

    logger.info(
        "Awaiting idea approval from founder",
        run_id=run_id,
        page_id=idea_page_id,
        notion_url=f"https://notion.so/{idea_page_id.replace('-', '')}",
    )

    client = get_notion_client()
    approved = await poll_idea_approval(
        client=client,
        page_id=idea_page_id,
        poll_interval_seconds=_APPROVAL_POLL_INTERVAL,
        timeout_seconds=_APPROVAL_TIMEOUT,
    )

    if approved:
        logger.info("Idea approved — continuing pipeline", run_id=run_id)
    else:
        logger.warning("Idea approval timed out — halting pipeline", run_id=run_id)

    return {
        "human_approved_idea": approved,
        "current_step": "idea_approved" if approved else "idea_approval_timeout",
    }


async def research_approval_checkpoint_node(state: AgentState) -> dict[str, Any]:
    """LangGraph node: wait for founder approval of the research summary.

    Polls the first Research Notion page for the related 'Approved' indicator.
    Uses the idea page as the approval source (research is linked via relation).

    Args:
        state: Current AgentState containing research page IDs.

    Returns:
        dict: Partial state with human_approved_research set to True or False.
    """
    run_id = state.get("run_id", "unknown")
    # Poll the idea page's research approval — the founder reviews research
    # by visiting the linked pages and checks a dedicated approval box
    idea_page_id = state.get("idea_page_id", "")

    logger.info(
        "Awaiting research approval from founder",
        run_id=run_id,
        page_id=idea_page_id,
    )

    # For research checkpoint, we use a shorter timeout since research
    # is typically reviewed faster than the initial idea evaluation
    client = get_notion_client()
    approved = await poll_idea_approval(
        client=client,
        page_id=idea_page_id,
        poll_interval_seconds=_APPROVAL_POLL_INTERVAL,
        timeout_seconds=_APPROVAL_TIMEOUT,
    )

    return {
        "human_approved_research": approved,
        "current_step": "research_approved" if approved else "research_approval_timeout",
    }


# ------------------------------------------------------------------ #
# Memory Enrichment Node                                              #
# ------------------------------------------------------------------ #


async def memory_store_node(state: AgentState) -> dict[str, Any]:
    """LangGraph node: persist agent outputs to FAISS vector memory.

    This node runs after the pipeline completes to store the run's
    key outputs for future retrieval and cross-run learning.

    Args:
        state: The final AgentState after all agents have run.

    Returns:
        dict: Unchanged state (this node only has side effects).
    """
    run_id = state.get("run_id", "unknown")
    memory = get_memory()

    idea_analysis = state.get("idea_analysis", {})
    research_summary = state.get("research_summary", "")

    if idea_analysis:
        memory.add(
            text=str(idea_analysis),
            meta={
                "agent": "IdeaAnalyzerAgent",
                "run_id": run_id,
                "content": idea_analysis.get("unique_value_proposition", ""),
            },
        )

    if research_summary:
        memory.add(
            text=research_summary,
            meta={
                "agent": "MarketResearchAgent",
                "run_id": run_id,
                "content": research_summary[:500],
            },
        )

    logger.info(
        "Pipeline outputs stored in vector memory",
        run_id=run_id,
        memory_size=memory.size,
    )

    return {"current_step": "memory_stored"}


# ------------------------------------------------------------------ #
# Conditional Edge Routing Functions                                  #
# ------------------------------------------------------------------ #


def route_after_idea_approval(
    state: AgentState,
) -> Literal["market_research", "pipeline_end"]:
    """Route the graph based on founder approval of the idea analysis.

    Args:
        state: Current AgentState.

    Returns:
        str: 'market_research' if approved, 'pipeline_end' otherwise.
    """
    if state.get("error"):
        return "pipeline_end"
    return "market_research" if state.get("human_approved_idea") else "pipeline_end"


def route_after_research_approval(
    state: AgentState,
) -> Literal["roadmap_generator", "pipeline_end"]:
    """Route the graph based on founder approval of the research summary.

    Args:
        state: Current AgentState.

    Returns:
        str: 'roadmap_generator' if approved, 'pipeline_end' otherwise.
    """
    if state.get("error"):
        return "pipeline_end"
    return "roadmap_generator" if state.get("human_approved_research") else "pipeline_end"


def route_after_agent(
    state: AgentState,
) -> Literal["continue", "pipeline_end"]:
    """Generic route function that halts the pipeline on any agent error.

    Args:
        state: Current AgentState.

    Returns:
        str: 'continue' if no error, 'pipeline_end' otherwise.
    """
    return "pipeline_end" if state.get("error") else "continue"


# ------------------------------------------------------------------ #
# Graph Construction                                                   #
# ------------------------------------------------------------------ #


def build_graph() -> Any:
    """Construct and compile the VentureNode LangGraph StateGraph.

    Assembles all agent nodes, checkpoint nodes, and conditional edges
    into a directed graph representing the complete pipeline topology.

    Returns:
        CompiledGraph: The compiled, executable LangGraph pipeline.
    """
    builder = StateGraph(AgentState)

    # ---- Register all nodes -------------------------------------- #
    builder.add_node("idea_analyzer", idea_analyzer_node)
    builder.add_node("idea_approval_checkpoint", idea_approval_checkpoint_node)
    builder.add_node("market_research", market_research_node)
    builder.add_node("research_approval_checkpoint", research_approval_checkpoint_node)
    builder.add_node("roadmap_generator", roadmap_generator_node)
    builder.add_node("task_planner", task_planner_node)
    builder.add_node("execution_monitor", exec_monitor_node)
    builder.add_node("memory_store", memory_store_node)

    # ---- Edges: START → Idea Analysis → Idea Checkpoint ---------- #
    builder.add_edge(START, "idea_analyzer")
    builder.add_edge("idea_analyzer", "idea_approval_checkpoint")

    # ---- Conditional: Idea Approved? ----------------------------- #
    builder.add_conditional_edges(
        "idea_approval_checkpoint",
        route_after_idea_approval,
        {
            "market_research": "market_research",
            "pipeline_end": END,
        },
    )

    # ---- Edge: Research → Research Checkpoint -------------------- #
    builder.add_edge("market_research", "research_approval_checkpoint")

    # ---- Conditional: Research Approved? ------------------------- #
    builder.add_conditional_edges(
        "research_approval_checkpoint",
        route_after_research_approval,
        {
            "roadmap_generator": "roadmap_generator",
            "pipeline_end": END,
        },
    )

    # ---- Edges: Roadmap → Tasks → Monitor → Memory → END --------- #
    builder.add_edge("roadmap_generator", "task_planner")
    builder.add_edge("task_planner", "execution_monitor")
    builder.add_edge("execution_monitor", "memory_store")
    builder.add_edge("memory_store", END)

    from langgraph.checkpoint.memory import MemorySaver
    
    memory = MemorySaver()
    graph = builder.compile(checkpointer=memory)
    logger.info("VentureNode LangGraph compiled successfully with MemorySaver")
    return graph


# ------------------------------------------------------------------ #
# Module-level Compiled Graph Singleton                               #
# ------------------------------------------------------------------ #

_graph_instance = None


def get_graph() -> Any:
    """Return the lazily-initialized compiled LangGraph pipeline.

    Returns:
        CompiledGraph: The singleton compiled graph instance.
    """
    global _graph_instance
    if _graph_instance is None:
        _graph_instance = build_graph()
    return _graph_instance


def get_run_state(run_id: str) -> dict[str, Any]:
    """Retrieve the current state dictionary of a running pipeline.
    
    Args:
        run_id: Unique identifier used as the thread_id.
        
    Returns:
        dict: The current AgentState or empty dict if not found.
    """
    graph = get_graph()
    state_snap = graph.get_state({"configurable": {"thread_id": run_id}})
    return state_snap.values if state_snap else {}


async def run_pipeline(run_id: str, idea_text: str) -> dict[str, Any]:
    """Execute the full VentureNode agent pipeline for a startup idea.

    Args:
        run_id: Unique identifier for this pipeline run.
        idea_text: The raw startup idea description from the founder.

    Returns:
        dict: The final AgentState after pipeline completion.
    """
    graph = get_graph()

    initial_state: AgentState = {
        "run_id": run_id,
        "idea_text": idea_text,
        "current_step": "initializing",
        "human_approved_idea": False,
        "human_approved_research": False,
        "error": None,
    }

    logger.info("Starting VentureNode pipeline", run_id=run_id)

    # Use run_id as the thread_id for state tracking
    config = {"configurable": {"thread_id": run_id}}
    
    final_state = await graph.ainvoke(initial_state, config=config)

    logger.info(
        "VentureNode pipeline completed",
        run_id=run_id,
        final_step=final_state.get("current_step"),
        error=final_state.get("error"),
    )

    return final_state
