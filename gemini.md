# VentureNode — Gemini Instructions

## Project Context
VentureNode is an autonomous multi-agent AI startup operating system. The backend is Python 3.11+ (FastAPI + LangGraph). The frontend is Next.js 14 (Tailwind + Radix UI + Clerk v7). Notion is the exclusive data store and operational interface.

---

## Strict Rules

### 1. Free Stack Only
- LLM: Groq (`llama-3.3-70b-versatile`) via `langchain_groq.ChatGroq`
- Search: `DuckDuckGoSearchRun` for all OSINT — zero paid search APIs
- Vector memory: FAISS (`faiss-cpu`) — zero Pinecone, Weaviate, or Chroma
- Auth: Clerk (free tier) for JWT-based dashboard access control
- Data: Notion API — zero external databases

### 2. Framework Adherence
- FastAPI for all backend endpoints — `async def` exclusively
- Next.js App Router only — zero Page Router patterns
- Clerk v7 — use `useAuth()`, `useUser()`, `useClerk()` from `@clerk/nextjs`

### 3. No Placeholders
All generated code must be production-ready and immediately runnable. Zero `TODO` comments. Zero `pass` statements. Zero placeholder functions.

### 4. Phase Discipline
Implement in order: Backend → Agent Orchestration → Frontend → Integration

### 5. Notion Schema Compliance
Every database write must match the exact property types in `docs/notion-setup.md`.

### 6. Application Routing Architecture
- **Marketing Site:** `/` is the public, unprotected open-source marketing landing page.
- **Application Dashboard:** `/dashboard` is the private, protected dashboard interface.
- **Middleware:** [frontend/src/middleware.ts](cci:7://file:///c:/Users/prakh/OneDrive/Desktop/FounderOS/frontend/src/middleware.ts:0:0-0:0) uses `publicRoutes: ["/"]` to allow unauthenticated access to the landing page.

---

## Key System Contracts

| Contract | Location | Rule |
|---|---|---|
| **Notion client** | `backend/notion/mcp_client.py` | Single point of contact for all reads/writes |
| **LangGraph graph** | `backend/orchestrator/graph.py` | All agent nodes and checkpoints defined here |
| **Config / env** | `backend/core/config.py` | `Pydantic BaseSettings` — no direct `os.environ` |
| **Frontend API** | `frontend/src/lib/api.ts` | The ONLY file making HTTP requests to FastAPI |
| **Auth dependency** | `backend/api/auth.py` | `CurrentUser` — Clerk JWT → `ClerkUser(tenant_id, email)` |

---

## When Generating Python Code

```python
# Route signature pattern
from backend.api.auth import CurrentUser

@router.get("/notion/ideas")
async def list_ideas(
    client: NotionClient,
    current_user: CurrentUser,
) -> dict[str, Any]:
    """Google-style docstring required."""
    results = await mcp_client.get_ideas(client, tenant_id=current_user.tenant_id)
    return {"count": len(results), "results": results}
```

- `async def` for all routes and Notion operations
- Full type hints on all function signatures
- Google-style docstrings on all public functions
- Structured logging via `get_logger(__name__)` from `backend/core/logging`

---

## When Generating TypeScript/React Code

```typescript
// API call pattern (all pages follow this)
"use client";
import { useAuth } from "@clerk/nextjs";
import { getSomeData } from "@/lib/api";

export default function Page() {
  const { getToken } = useAuth();
  
  const fetchData = async () => {
    const token = await getToken();
    const data = await getSomeData(token ?? "");
  };
}
```

- Always call `getToken()` from `useAuth()` before any API call
- Pass the token as the last argument to all `api.ts` functions
- Never call `fetch` or `axios` directly from components — use `frontend/src/lib/api.ts`
