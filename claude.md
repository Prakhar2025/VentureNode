# VentureNode — Claude Instructions

## Project Context
VentureNode is a stateful, multi-agent AI system that uses Notion as its operational database, orchestrated via LangGraph on a FastAPI backend with a Next.js frontend.

## What You MUST Know
- **Notion Schema is the Contract.** When generating Notion writes, always match property types exactly: `title`, `rich_text`, `number`, `select`, `date`, `checkbox`, `relation`. Wrong property types silently fail.
- **State Passes Through LangGraph.** Every agent node receives the full `AgentState: TypedDict` and must return a partial dict of only the keys it modifies. Never return the full state object.
- **Checkpoints Are Async Polls.** Human-in-the-loop checkpoints poll the Notion database for a checkbox toggle. They are not blocking — they are implemented as async loops with exponential backoff.

## Code Generation Rules
1. Complete, runnable code only. No `# TODO`, no `pass`, no placeholder functions.
2. All agents return Pydantic models, not raw strings.
3. For Notion writes: use the `mcp_client.py` wrapper, not the raw Notion SDK.
4. For market research: use `DuckDuckGoSearchRun` + `BeautifulSoup4` only.
5. For Groq: use `langchain_groq.ChatGroq` with structured output via `.with_structured_output(PydanticModel)`.

## Design Principles for Responses
- Prioritize LangGraph state management correctness above all else.
- When in doubt about a Notion schema, ask — do not guess property names.
- Keep each agent minimal. One agent = one responsibility.
