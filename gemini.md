# VentureNode — Gemini Instructions

## Project Context
VentureNode is an autonomous multi-agent AI startup operating system. The backend is Python (FastAPI + LangGraph). The frontend is Next.js 14 (Tailwind + Shadcn UI). Notion is the exclusive data store and operational interface.

## Strict Rules
1. **Free Stack Only**: Groq for LLM inference, DuckDuckGoSearchRun for OSINT, FAISS for vector memory, Notion API for storage.
2. **Framework Adherence**: FastAPI for all backend endpoints. Next.js App Router only — no Page Router patterns.
3. **No Placeholders**: All generated code must be production-ready and immediately runnable. No `TODO` comments.
4. **Phase Discipline**: Implement in order — Backend Setup → Agent Orchestration → Frontend → Integration.
5. **Notion Schema Compliance**: Every database write must match the exact property types defined in `docs/notion-setup.md`.

## Key System Contracts
- `backend/notion/mcp_client.py` is the single point of contact for Notion. All reads/writes go here.
- `backend/orchestrator/graph.py` defines the LangGraph graph. Agents are nodes, checkpoints evaluate state.
- `backend/core/config.py` loads and validates all environment variables using Pydantic `BaseSettings`.
- `frontend/lib/api.ts` is the only place that makes HTTP requests to FastAPI.

## When Generating Python Code
- Use `async def` for all FastAPI routes and Notion operations.
- Always include type hints on function signatures.
- Use Google-style docstrings.
