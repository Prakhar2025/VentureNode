"""
VentureNode — Market Research Agent.

The second node in the VentureNode pipeline. Performs live, grounded
market research by combining DuckDuckGo search with BeautifulSoup scraping,
then synthesizes findings via Groq into a structured competitive analysis.

This is what separates VentureNode from generic AI wrappers: research
results are grounded in real, scraped web data — not LLM hallucinations.

Responsibilities:
  1. Derive 3–5 search queries from the idea analysis.
  2. Execute live DuckDuckGo searches for each query.
  3. Scrape the landing page of each result for raw content.
  4. Synthesize all content into a structured ResearchSummary via Groq.
  5. Write findings to the Notion 'Research' database.
"""

from __future__ import annotations

import asyncio
from typing import Any
from urllib.parse import urlparse

import requests
from bs4 import BeautifulSoup
from duckduckgo_search import DDGS
from langchain_core.prompts import ChatPromptTemplate

from backend.agents.base import (
    capture_error,
    get_llm,
    log_agent_complete,
    log_agent_start,
)
from backend.notion.mcp_client import create_research, get_notion_client
from backend.orchestrator.state import AgentState, IdeaAnalysis, ResearchSummary

_AGENT_NAME = "MarketResearchAgent"

_SCRAPE_TIMEOUT = 6
_MAX_SCRAPED_CHARS = 1500
_SEARCH_RESULTS_PER_QUERY = 4

_SYNTHESIS_SYSTEM = """\
You are a senior market analyst at a top-tier venture capital firm.
You have been given scraped web content from multiple sources about a
startup idea. Your task is to synthesize this raw content into a
rigorous, evidence-based competitive landscape analysis.

Rules:
- Only use information present in the scraped content. Do not invent facts.
- If information is insufficient for a field, clearly state 'Insufficient data'.
- Include real competitor names only if they appear in the scraped content.
- Be precise and actionable — this analysis will directly drive product strategy.
"""

_SYNTHESIS_HUMAN = """\
Startup Idea: {idea_name}
Market Hypothesis: {market_hypothesis}

Scraped Research Content:
{scraped_content}

Produce a structured competitive analysis based solely on the above content.
"""


def _build_search_queries(analysis: IdeaAnalysis) -> list[str]:
    """Derive targeted OSINT queries from the idea analysis.

    Args:
        analysis: The structured IdeaAnalysis from the previous agent.

    Returns:
        list[str]: A list of search query strings to execute.
    """
    return [
        f"{analysis.idea_name} competitors 2024 2025",
        f"{analysis.idea_name} market size industry analysis",
        f"{analysis.target_customer} pain points challenges",
        f"best {analysis.idea_name} alternatives startups funding",
        f"{analysis.idea_name} trends market growth",
    ]


def _scrape_url(url: str) -> str:
    """Scrape and clean the text content from a URL.

    Fetches the page content, parses HTML with BeautifulSoup, and
    extracts up to _MAX_SCRAPED_CHARS of meaningful text content
    from paragraph and heading tags.

    Args:
        url: The URL to scrape.

    Returns:
        str: Cleaned text content, or empty string on failure.
    """
    try:
        # Validate URL scheme to prevent SSRF-style issues
        parsed = urlparse(url)
        if parsed.scheme not in ("http", "https"):
            return ""

        headers = {
            "User-Agent": (
                "Mozilla/5.0 (compatible; VentureNode/1.0; +https://github.com/Prakhar2025/VentureNode)"
            )
        }
        response = requests.get(url, timeout=_SCRAPE_TIMEOUT, headers=headers)
        response.raise_for_status()

        soup = BeautifulSoup(response.text, "lxml")

        # Remove script, style, nav, and footer noise
        for tag in soup(["script", "style", "nav", "footer", "header", "aside"]):
            tag.decompose()

        # Extract meaningful text from paragraphs and headings
        content_tags = soup.find_all(["p", "h1", "h2", "h3", "li"])
        text = " ".join(tag.get_text(separator=" ", strip=True) for tag in content_tags)

        # Normalize whitespace and cap length
        normalized = " ".join(text.split())
        return normalized[:_MAX_SCRAPED_CHARS]

    except Exception:
        return ""


def _run_search_and_scrape(queries: list[str]) -> tuple[list[dict], str]:
    """Execute DuckDuckGo searches and scrape result pages.

    Runs searches for all queries, collects unique URLs, and scrapes
    their content. Returns both the raw result metadata and the
    aggregated scraped text corpus.

    Args:
        queries: List of search query strings.

    Returns:
        tuple: (list of search result dicts, aggregated scraped text)
    """
    all_results: list[dict] = []
    seen_urls: set[str] = set()
    scraped_corpus: list[str] = []

    with DDGS() as ddgs:
        for query in queries:
            try:
                results = list(ddgs.text(query, max_results=_SEARCH_RESULTS_PER_QUERY))
                for result in results:
                    url = result.get("href", "")
                    if url and url not in seen_urls:
                        seen_urls.add(url)
                        all_results.append(result)

                        # Scrape body text
                        scraped_text = _scrape_url(url)
                        if scraped_text:
                            scraped_corpus.append(
                                f"[Source: {url}]\n{scraped_text}"
                            )
            except Exception:
                continue

    return all_results, "\n\n---\n\n".join(scraped_corpus[:8])


async def market_research_node(state: AgentState) -> dict[str, Any]:
    """LangGraph node: conduct live market research and write to Notion.

    This node runs synchronous scraping in a thread pool to avoid blocking
    the async event loop, then synthesizes results with Groq.

    Args:
        state: The current LangGraph AgentState.

    Returns:
        dict: Partial state update with research_page_ids, research_summary,
              and current_step. On failure, returns error state.
    """
    run_id: str = state.get("run_id", "unknown")
    idea_page_id: str = state.get("idea_page_id", "")
    idea_analysis_dict: dict = state.get("idea_analysis", {})

    log_agent_start(_AGENT_NAME, run_id)

    try:
        analysis = IdeaAnalysis.model_validate(idea_analysis_dict)
        queries = _build_search_queries(analysis)

        # ---- 1. Search + Scrape (run in thread pool) ----------------- #
        loop = asyncio.get_event_loop()
        search_results, scraped_corpus = await loop.run_in_executor(
            None,
            _run_search_and_scrape,
            queries,
        )

        if not scraped_corpus.strip():
            scraped_corpus = (
                f"Limited web data found for '{analysis.idea_name}'. "
                "Base analysis on general knowledge of the startup landscape."
            )

        # ---- 2. Synthesize with Groq --------------------------------- #
        llm = get_llm(temperature_override=0.15)
        structured_llm = llm.with_structured_output(ResearchSummary)

        prompt = ChatPromptTemplate.from_messages([
            ("system", _SYNTHESIS_SYSTEM),
            ("human", _SYNTHESIS_HUMAN),
        ])

        chain = prompt | structured_llm
        summary: ResearchSummary = await chain.ainvoke({
            "idea_name": analysis.idea_name,
            "market_hypothesis": analysis.market_hypothesis,
            "scraped_content": scraped_corpus,
        })

        source_urls = [r.get("href", "") for r in search_results[:10] if r.get("href")]

        # ---- 3. Write each competitor to Notion Research DB ---------- #
        client = get_notion_client()
        page_ids: list[str] = []

        # Write the main summary page
        main_page_id = await create_research(
            client=client,
            topic=f"Market Analysis — {analysis.idea_name}",
            summary=(
                f"Market Size: {summary.market_size_estimate}\n\n"
                f"Verdict: {summary.overall_verdict}\n\n"
                f"Opportunity Gaps:\n" + "\n".join(f"• {g}" for g in summary.opportunity_gaps) + "\n\n"
                f"Trends:\n" + "\n".join(f"• {t}" for t in summary.market_trends)
            ),
            sources=source_urls[:10],
            confidence="High" if len(scraped_corpus) > 500 else "Medium",
            related_idea_id=idea_page_id,
        )
        page_ids.append(main_page_id)

        # Write individual competitor pages
        for competitor in summary.key_competitors:
            comp_page_id = await create_research(
                client=client,
                topic=f"Competitor: {competitor.name}",
                summary=(
                    f"{competitor.description}\n\n"
                    f"Key Weakness: {competitor.weakness}"
                ),
                sources=[competitor.source_url] if competitor.source_url else [],
                confidence="Medium",
                related_idea_id=idea_page_id,
            )
            page_ids.append(comp_page_id)

        # Build a compact text summary for downstream agents
        research_summary_text = (
            f"Market Size: {summary.market_size_estimate}\n"
            f"Main Competitors: {', '.join(c.name for c in summary.key_competitors)}\n"
            f"Key Trends: {'; '.join(summary.market_trends)}\n"
            f"Opportunities: {'; '.join(summary.opportunity_gaps)}\n"
            f"Verdict: {summary.overall_verdict}"
        )

        log_agent_complete(
            _AGENT_NAME,
            run_id,
            page_count=len(page_ids),
            competitors=len(summary.key_competitors),
        )

        return {
            "research_page_ids": page_ids,
            "research_summary": research_summary_text,
            "current_step": "research_complete",
            "human_approved_research": False,
            "error": None,
        }

    except Exception as exc:
        return capture_error(state, _AGENT_NAME, exc)
