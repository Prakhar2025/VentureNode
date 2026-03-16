# VentureNode — System Architecture

This document describes the full technical architecture of VentureNode. It is intended for contributors, technical reviewers, and anyone seeking a comprehensive understanding of the system's design decisions.

---

## 1. Architectural Philosophy

VentureNode is architected around four core principles:

1. **Agents as Microservices**: Each AI agent is a discrete, independently testable unit with a single responsibility. Agents do not share runtime state — they communicate exclusively via the LangGraph state object.
2. **Notion as the Source of Truth**: All structured data lives in Notion databases. There is no secondary relational database. Notion is both the operational store and the human-facing interface.
3. **Human-in-the-Loop by Design**: The system never auto-executes irreversible actions. Every major pipeline transition requires an explicit signal from the founder (a Notion checkbox toggle), which the backend detects via polling.
4. **100% Free, Open Stack**: Every tool and library in the system is open-source and free to use. There are no runtime costs for production use at small scale.

---

## 2. High-Level System Diagram

```
┌──────────────────────────────────────────────────────────────────┐
│                       EXTERNAL INTERFACES                         │
│                                                                    │
│   ┌──────────────────┐                ┌───────────────────────┐  │
│   │  Founder Browser │                │   Notion Workspace    │  │
│   │  (Next.js :3000) │                │   (Human Interface)   │  │
│   └────────┬─────────┘                └──────────┬────────────┘  │
└────────────│─────────────────────────────────────│───────────────┘
             │  REST/HTTP                           │  Notion API
             ▼                                      ▼
┌──────────────────────────────────────────────────────────────────┐
│                         VENTURENODE CORE                          │
│                                                                    │
│  ┌─────────────────────┐     ┌──────────────────────────────┐   │
│  │    FastAPI Server   │────▶│  LangGraph Orchestration     │   │
│  │    (Port 8000)      │     │  Engine                      │   │
│  └─────────────────────┘     │                              │   │
│                               │  ┌───────────────────────┐  │   │
│                               │  │  Idea Analyzer        │  │   │
│                               │  │  Market Research      │  │   │
│                               │  │  Roadmap Generator    │  │   │
│                               │  │  Task Planner         │  │   │
│                               │  │  Exec. Monitor        │  │   │
│                               │  └───────────────────────┘  │   │
│                               └──────────────────────────────┘   │
│                                             │                     │
│  ┌──────────────────┐          ┌────────────▼──────────────┐    │
│  │  FAISS Memory    │◀────────▶│  Notion MCP Client        │    │
│  │  (Vector Store)  │          │  (Read / Write / Poll)    │    │
│  └──────────────────┘          └───────────────────────────┘    │
└──────────────────────────────────────────────────────────────────┘
```

---

## 3. Agent Specifications

Each agent is a LangGraph node that receives the global `AgentState` Pydantic object, performs its work, and returns a partial state update.

### 3.1 Idea Analyzer Agent

**File**: `backend/agents/idea_agent.py`

| Property | Value |
|---|---|
| **Input** | `idea_text: str` from the initial state |
| **Tools** | Groq (Llama 3.3-70b) for structured JSON output |
| **Output** | `IdeaAnalysis` Pydantic model written to Notion `Ideas` DB |
| **Notion Properties Written** | `Idea Name`, `Description`, `Opportunity Score (1-10)`, `Risk Score (1-10)`, `Status: Pending Approval` |

**Reasoning strategy**: Uses a structured output prompt with enforced JSON schema to prevent hallucination on numeric scores. The agent also writes a `hypothesis` field explaining the scoring rationale.

---

### 3.2 Market Research Agent

**File**: `backend/agents/research_agent.py`

| Property | Value |
|---|---|
| **Input** | `idea_name: str`, `market_hypothesis: str` |
| **Tools** | `DuckDuckGoSearchRun`, `BeautifulSoup4` |
| **Output** | Competitor analysis, trend summaries written to Notion `Research` DB |
| **Notion Properties Written** | `Topic`, `Summary`, `Sources (multi-select)`, `Confidence Level`, `Related Idea (Relation)` |

**Reasoning strategy**: The agent runs 3–5 targeted search queries derived from the idea hypothesis. For each result, it scrapes the landing page text (`<p>` and `<h>` tags only via BeautifulSoup) and summarizes it using Groq. All sources are cited by URL. This results in a grounded, evidence-backed competitive analysis — not LLM guesses.

---

### 3.3 Roadmap Generator Agent

**File**: `backend/agents/roadmap_agent.py`

| Property | Value |
|---|---|
| **Input** | `idea_analysis`, `research_summary` |
| **Tools** | Groq |
| **Output** | 3-phase product roadmap written to Notion `Roadmap` DB |
| **Notion Properties Written** | `Feature Name`, `Priority (High/Med/Low)`, `Phase (1/2/3)`, `Status: Not Started` |

---

### 3.4 Task Planning Agent

**File**: `backend/agents/task_agent.py`

| Property | Value |
|---|---|
| **Input** | `roadmap_items` (list of Roadmap database records) |
| **Tools** | Groq |
| **Output** | Granular tasks written to Notion `Tasks` DB |
| **Notion Properties Written** | `Task Title`, `Description`, `Priority`, `Deadline`, `Status`, `Assigned Agent`, `Related Feature (Relation)` |

---

### 3.5 Execution Monitor Agent

**File**: `backend/agents/exec_monitor_agent.py`

| Property | Value |
|---|---|
| **Trigger** | CRON job or on-demand call |
| **Tools** | Notion API (reads `Tasks` DB), Groq |
| **Output** | Weekly reports written to Notion `Reports` DB |
| **Logic** | Computes completion %, identifies overdue tasks, generates insights |

---

## 4. LangGraph Orchestration

**File**: `backend/orchestrator/graph.py`

The orchestration graph is a **conditional directed acyclic graph** compiled by LangGraph. State transitions are gated by `human_approval` flags within the `AgentState`.

```python
# Simplified state definition
class AgentState(TypedDict):
    idea_text: str
    idea_analysis: Optional[IdeaAnalysis]
    research_summary: Optional[ResearchSummary]
    roadmap_items: Optional[List[RoadmapItem]]
    tasks: Optional[List[Task]]
    human_approved_idea: bool
    human_approved_research: bool
    error: Optional[str]
```

**Graph Edges**:
- `START → idea_analyzer`
- `idea_analyzer → CHECKPOINT` (poll Notion for `human_approved_idea = True`)
- `CHECKPOINT → research_agent` (conditional: if approved)
- `research_agent → CHECKPOINT_2` (poll Notion for `human_approved_research = True`)
- `CHECKPOINT_2 → roadmap_agent`
- `roadmap_agent → task_agent`
- `task_agent → END`

---

## 5. Notion MCP Client

**File**: `backend/notion/mcp_client.py`

The client wraps the official `notion-client` Python SDK. It provides typed methods per database action, ensuring agents never construct raw API payloads.

```python
# Example: Create a record in the Ideas database
async def create_idea(notion_client, idea: IdeaAnalysis) -> str:
    """Creates a new page in the Ideas database and returns the page ID."""
    ...

# Example: Poll for human approval
async def poll_idea_approval(notion_client, page_id: str) -> bool:
    """Returns True if the founder checked the Approved checkbox on the given page."""
    ...
```

All database IDs are injected via environment variables. No hardcoded IDs anywhere in the codebase.

---

## 6. Memory System

**File**: `backend/memory/vector_store.py`

VentureNode uses **FAISS** (Facebook AI Similarity Search) as an in-process local vector database. This allows agents to retrieve historically relevant research data and idea analyses from past runs, enabling cross-startup knowledge transfer.

**Pipeline**:
```
Raw Text → Sentence Embedding (Groq) → FAISS Index → Retrieval during Agent Runs
```

---

## 7. API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/v1/workflow/start` | Start a new VentureNode workflow for an idea |
| `GET` | `/api/v1/workflow/{run_id}/status` | Poll the current status of a running workflow |
| `GET` | `/api/v1/notion/ideas` | Fetch all records from the Notion Ideas DB |
| `GET` | `/api/v1/notion/research` | Fetch all records from the Notion Research DB |
| `GET` | `/api/v1/notion/roadmap` | Fetch all records from the Notion Roadmap DB |
| `GET` | `/api/v1/notion/tasks` | Fetch all records from the Notion Tasks DB |
| `POST` | `/api/v1/monitor/report` | Trigger the Execution Monitor Agent manually |

---

## 8. Security Considerations

- All API keys are loaded from environment variables. `.env` files are `.gitignore`d.
- The FastAPI backend uses CORS middleware configured to allow only the local frontend origin in development.
- Notion tokens are scoped to an Internal Integration with access only to the specific databases shared with it.
- Rate limiting is enforced at the FastAPI layer using `slowapi`.
