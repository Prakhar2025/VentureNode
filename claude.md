# VentureNode — Claude Instructions

## Project Context
VentureNode is a production LangGraph multi-agent system using Notion as its exclusive operational database. It is orchestrated via a 5-node `StateGraph` on a FastAPI backend with a Next.js 14 App Router frontend protected by Clerk v7 JWT authentication.

The pipeline is: `Idea Analyzer → [Human Checkpoint] → Market Research → [Human Checkpoint] → Roadmap Builder → Task Planner → Exec Monitor → FAISS Memory Store`.

---

## Critical Technical Contracts

### 1. Notion Schema is the Contract
When generating Notion writes, match property types exactly as defined in `docs/notion-setup.md`.
Wrong property types cause silent Notion API failures. The only valid types are: `title`, `rich_text`, `number`, `select`, `multi_select`, `date`, `checkbox`, `relation`.

### 2. LangGraph State Management
- State type: `AgentState(TypedDict)` defined in `backend/orchestrator/graph.py`.
- Every agent node receives the FULL state dict and MUST return ONLY the keys it modifies.
- Never return the full state. Never mutate state in-place.
- Human checkpoints are implemented as async polling loops in `mcp_client.py` — `poll_idea_approval()`. They are NOT blocking. They use `asyncio.sleep` and exponential backoff.

### 3. The Notion MCP Client is Sacred
- `backend/notion/mcp_client.py` is the single point of contact for all Notion operations.
- No agent, no route, and no graph node may import `notion_client` directly.
- Always use the async wrapper functions: `create_idea()`, `get_ideas()`, `create_research()`, etc.

### 4. Groq Structured Output
```python
from langchain_groq import ChatGroq
from pydantic import BaseModel

llm = ChatGroq(model="llama-3.3-70b-versatile", temperature=0.2)
structured_llm = llm.with_structured_output(YourPydanticModel)
result: YourPydanticModel = await structured_llm.ainvoke(prompt)
```
Always use `.with_structured_output(PydanticModel)`. Never parse raw strings from the LLM.

### 5. Authentication (Clerk v7)
- FastAPI dependency: `CurrentUser` imported from `backend/api/auth.py`.
- Use `Annotated[ClerkUser, Depends(get_current_user)]` in route signatures.
- `ClerkUser.tenant_id` is the Clerk `sub` claim (e.g., `user_3BWbA0sc...`).
- Frontend: always call `const { getToken } = useAuth()` and pass `Authorization: Bearer <token>` header.

### 6. Application Routing Architecture (NEW)
- `/` (Root): The public, unprotected Next.js Open-Source Marketing Landing Page.
- `/dashboard`: The private, protected application interface (previously at `/`).
- Clerk `middleware.ts` must be configured with `publicRoutes: ["/"]` so the landing page is accessible without logging in.

---

## Code Generation Rules
1. Complete, runnable code only. Zero `# TODO`, zero `pass`, zero placeholder functions.
2. All agents return Pydantic v2 models (`from pydantic import BaseModel`), not raw strings.
3. All Notion writes: use `mcp_client.py` functions, never raw SDK calls.
4. Market research: `DuckDuckGoSearchRun` + optional `BeautifulSoup4`. Never SerpApi.
5. All FastAPI routes are `async def`. All Notion operations are `async def`.
6. Log with `structlog` via `backend/core/logging.py`'s `get_logger()`. Never `print()`.

---

## Design Principles
- **Correctness over cleverness.** LangGraph state management errors are silent and catastrophic.
- **One agent, one responsibility.** Resist the urge to make agents do two things.
- **Ask before guessing Notion property names.** A wrong property name causes a 400 from Notion's API with no useful error message.

---

