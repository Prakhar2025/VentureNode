<div align="center">

<br />

<img src="docs/assets/banner.png" alt="VentureNode Banner" width="100%" />

<br />

# VentureNode

### The Autonomous AI Operating System for Startups

**An open-source, multi-agent AI system that turns a raw startup idea into a fully planned, researched, and tracked operation — all living inside your Notion workspace.**

<br />

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![Python](https://img.shields.io/badge/Python-3.11+-3776AB?logo=python&logoColor=white)](https://python.org)
[![Next.js](https://img.shields.io/badge/Next.js-14-black?logo=nextdotjs)](https://nextjs.org)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.110-009688?logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com)
[![LangGraph](https://img.shields.io/badge/LangGraph-0.2-7C3AED)](https://github.com/langchain-ai/langgraph)
[![Notion MCP](https://img.shields.io/badge/Notion-MCP%20Challenge-black?logo=notion)](https://developers.notion.com)
[![LLM: Groq](https://img.shields.io/badge/LLM-Groq%20%7C%20Llama%203.3--70b-F55036)](https://groq.com)

<br />

[**🚀 Quickstart**](#quickstart) · [**📐 Architecture**](#architecture) · [**📋 Notion Setup**](docs/notion-setup.md) · [**🐛 Report a Bug**](https://github.com/Prakhar2025/VentureNode/issues)

</div>

---

## The Problem

Early-stage founders waste 4–6 hours every day switching between planning tools, market research tabs, Jira boards, and Notion pages — none of which talk to each other. Every tool they use is **passive**. It waits to be told what to do.

Ideas die because execution never starts. Roadmaps drift because research is manual. Tasks pile up because no one connected the idea to the work.

## The Solution

VentureNode is a **live autonomous co-founder** — not a template, not a chatbot. It is a stateful, multi-agent AI system wired directly into your Notion workspace. You submit an idea. VentureNode's agents score it, research the market, build a phased roadmap, decompose it into execution tasks, and store everything inside your Notion databases — automatically.

> Think of it as a founding team of five AI specialists embedded inside your Notion. A Strategist, a Market Analyst, a Product Architect, a Project Manager, and an Operations Lead — all working in the background while you focus on building.

---

## How It Works

VentureNode orchestrates a **stateful LangGraph pipeline** of five specialized agents. Each agent writes structured, relational output directly into dedicated Notion databases. Human founders remain in full control via **checkpoint approvals** embedded as native Notion checkboxes — no extra tools required.

```
┌──────────────────────────────────────────────────────────────────────┐
│                       VENTURENODE SYSTEM FLOW                        │
│                                                                      │
│  Founder submits idea via Next.js Dashboard                          │
│            │                                                         │
│            ▼                                                         │
│  ┌─────────────────────┐                                             │
│  │   Idea Analyzer     │ → Scores Clarity, Risk, Opportunity (1–10)  │
│  └──────────┬──────────┘                                             │
│             │   ✅ Human Checkpoint: Tick "Approved" in Notion       │
│             ▼                                                         │
│  ┌─────────────────────┐                                             │
│  │  Market Research    │ → Live OSINT via DuckDuckGo + web scraping  │
│  └──────────┬──────────┘                                             │
│             │   ✅ Human Checkpoint: Approve Research in Notion      │
│             ▼                                                         │
│  ┌─────────────────────┐                                             │
│  │  Roadmap Builder    │ → Generates phased product milestones       │
│  └──────────┬──────────┘                                             │
│             ▼                                                         │
│  ┌─────────────────────┐                                             │
│  │   Task Planner      │ → Decomposes roadmap into P0/P1/P2 tickets  │
│  └──────────┬──────────┘                                             │
│             ▼                                                         │
│  ┌─────────────────────┐                                             │
│  │  Exec. Monitor      │ → Writes progress reports to Notion Reports │
│  └──────────┬──────────┘                                             │
│             ▼                                                         │
│  ┌─────────────────────┐                                             │
│  │   FAISS Memory      │ → Stores pipeline state as vector embeddings│
│  └─────────────────────┘                                             │
│                                                                      │
│  Everything writes to your private Notion workspace in real-time.   │
└──────────────────────────────────────────────────────────────────────┘
```

---

## Key Differentiators

|                              | VentureNode | Generic Notion Templates | Simple Chatbots |
|------------------------------|-------------|--------------------------|-----------------|
| **Stateful Multi-Agent Graph** | ✅ LangGraph   | ❌                         | ❌               |
| **Live Market Research (OSINT)** | ✅ DuckDuckGo  | ❌                         | ❌               |
| **Human-in-the-Loop Approvals** | ✅ Notion Checkbox | ❌                    | ❌               |
| **Relational Notion Databases** | ✅ 5 linked DBs | Partial                  | ❌               |
| **Agent Memory (RAG)**         | ✅ FAISS + Embeddings | ❌                  | ❌               |
| **100% Free Stack**            | ✅ Groq, FAISS, OSS | N/A               | ❌               |
| **Live Dashboard UI**          | ✅ Next.js 14  | ❌                         | ❌               |

---

## Architecture

```
venturenode/
├── backend/                    # Python 3.11+ / FastAPI application
│   ├── agents/                 # One file per agent (single-responsibility)
│   │   ├── idea_agent.py       # Idea scoring with Groq + structured output
│   │   ├── research_agent.py   # OSINT market intelligence
│   │   ├── roadmap_agent.py    # Phased milestone generation
│   │   ├── task_agent.py       # P0/P1/P2 ticket decomposition
│   │   └── exec_monitor_agent.py
│   ├── orchestrator/
│   │   └── graph.py            # LangGraph StateGraph definition (single source of truth)
│   ├── notion/
│   │   └── mcp_client.py       # ALL Notion reads/writes. Agents never call Notion directly.
│   ├── memory/
│   │   └── vector_store.py     # FAISS + sentence-transformers for pipeline memory
│   ├── api/
│   │   ├── auth.py             # Clerk JWT verification dependency
│   │   └── routes.py           # All FastAPI endpoints
│   ├── core/
│   │   ├── config.py           # Pydantic BaseSettings (single env loader)
│   │   └── logging.py          # Structured JSON logging (structlog)
│   └── main.py                 # App entrypoint, CORS, lifespan
│
├── frontend/                   # Next.js 14 App Router dashboard
│   ├── src/
│   │   ├── app/                # Route segments (ideas, research, roadmap, tasks, reports)
│   │   ├── components/         # Sidebar, UI primitives
│   │   └── lib/
│   │       └── api.ts          # The ONLY file that calls FastAPI endpoints
│   └── next.config.ts
│
└── docs/
    ├── notion-setup.md         # Step-by-step Notion database configuration
    └── assets/
        └── banner.png
```

---

## Tech Stack

### Backend
| Technology | Purpose |
|---|---|
| **Python 3.11+** | Core runtime |
| **FastAPI 0.110** | High-performance async REST API |
| **LangGraph** | Stateful multi-agent graph orchestration with `MemorySaver` |
| **Groq API** | Zero-latency LLM inference · Llama 3.3-70b-versatile |
| **DuckDuckGoSearchRun** | Free, no-key OSINT for market research |
| **BeautifulSoup4** | Web scraping for competitor intelligence |
| **FAISS** | Local vector store for cross-agent memory |
| **sentence-transformers** | Embeddings for FAISS (`all-MiniLM-L6-v2`) |
| **Notion MCP / API** | Primary data store for all agent outputs |
| **Clerk** | JWT-based authentication for dashboard access |

### Frontend
| Technology | Purpose |
|---|---|
| **Next.js 14 (App Router)** | React 19 framework with server components |
| **Tailwind CSS** | Utility-first styling |
| **Radix UI** | Accessible headless component primitives |
| **Framer Motion** | Micro-animations and page transitions |
| **Clerk (Next.js SDK)** | Authentication and session management |
| **Lucide React** | Icon system |

---

## Notion Workspace Structure

VentureNode writes fully structured, relational data to **five dedicated databases** inside your private Notion workspace:

| Database | Created By | Key Properties |
|---|---|---|
| **Ideas** | Idea Analyzer | Opportunity Score, Risk Score, Status, Approved ✅ |
| **Research** | Market Research Agent | Summary, Sources, Confidence Level, Related Idea |
| **Roadmap** | Roadmap Builder | Feature, Priority (High/Med/Low), Phase (1/2/3), Status |
| **Tasks** | Task Planner | Title, Priority (P0/P1/P2), Deadline, Assigned Agent |
| **Reports** | Exec. Monitor | Summary, Insights, Recommendations |

> Full schema with exact property types: [docs/notion-setup.md](docs/notion-setup.md)

---

## Quickstart

### Prerequisites
- Python 3.11+
- Node.js 18+
- [Notion](https://notion.so) account + Internal Integration Token
- [Groq API Key](https://console.groq.com) (free)
- [Clerk](https://clerk.com) account (free) · Create an application → get Publishable Key + Secret Key

### 1. Clone the repository

```bash
git clone https://github.com/Prakhar2025/VentureNode.git
cd VentureNode
```

### 2. Configure environment variables

Create a `.env` file in the project root:

```env
# Notion
NOTION_TOKEN=ntn_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

# Notion Database IDs (32-char hex from each database URL)
NOTION_IDEAS_DB_ID=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
NOTION_RESEARCH_DB_ID=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
NOTION_ROADMAP_DB_ID=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
NOTION_TASKS_DB_ID=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
NOTION_REPORTS_DB_ID=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
NOTION_MEMORY_PAGE_ID=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

# Groq
GROQ_API_KEY=gsk_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
GROQ_MODEL=llama-3.3-70b-versatile
GROQ_TEMPERATURE=0.2

# Clerk Authentication
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_xxxxxxxxxxxx
CLERK_SECRET_KEY=sk_test_xxxxxxxxxxxx

# API Config
CORS_ORIGINS=["http://localhost:3000"]
RATE_LIMIT_PER_MINUTE=60
```

### 3. Set up your Notion workspace

Follow the step-by-step guide in [docs/notion-setup.md](docs/notion-setup.md) to:
1. Create a Notion Internal Integration called `VentureNode`
2. Create the 5 required databases with the exact property schemas
3. Share each database with the integration
4. Copy the Database IDs into your `.env`

### 4. Start the backend

```bash
# Create and activate virtual environment
python -m venv .venv
.venv\Scripts\activate       # Windows
source .venv/bin/activate    # macOS/Linux

# Install dependencies
pip install -r requirements.txt

# Start FastAPI server
python -m uvicorn backend.main:app --reload
```

API is now running at `http://localhost:8000`. Docs at `http://localhost:8000/docs`.

### 5. Start the frontend

```bash
cd frontend
npm install
npm run dev
```

Open `http://localhost:3000`. Sign in with Clerk. You are live.

---

## End-to-End Demo Flow

After setup, test the complete agent pipeline:

1. **Submit an Idea** — Navigate to the Ideas page and submit: *"An AI-powered personal finance advisor for Gen Z"*
2. **AI Scores It** — Within ~10 seconds, the Idea Analyzer Agent creates a row in your Notion Ideas DB with Opportunity/Risk scores
3. **Approve in Notion** — Open your Notion workspace and tick the **Approved** checkbox on the idea row
4. **Watch the Agents Run** — Over the next ~45 seconds:
   - Market Research Agent scrapes competitors and writes to Research DB
   - Roadmap Builder creates Phase 1/2/3 milestones in Roadmap DB
   - Task Planner generates P0/P1/P2 tickets in Tasks DB
5. **View Results** — Refresh Research, Roadmap, and Tasks pages in the dashboard

---

## Project Status

- [x] FastAPI backend with structured logging, rate limiting, and CORS
- [x] Notion MCP client (`mcp_client.py`) — single point of contact for all DB ops
- [x] LangGraph 5-agent pipeline with `MemorySaver` checkpointing
- [x] FAISS vector memory with cross-run retrieval
- [x] Human-in-the-Loop approval gates (Notion checkbox polling)
- [x] Next.js 14 App Router dashboard with Clerk authentication
- [x] Kanban board auto-generation in Notion on task completion
- [ ] Multi-workspace OAuth support (Notion public integration)
- [ ] Real-time agent progress streaming (WebSocket)
- [ ] GitHub Actions CI/CD pipeline

---

## Contributing

Contributions are welcome. Please open an issue first to discuss what you'd like to change.

See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

---

## License

MIT — see [LICENSE](LICENSE) for details.

---

<div align="center">
  <sub>Built for the <a href="https://dev.to/challenges/notion">Notion MCP Challenge</a> on DEV.to · Powered entirely by open-source.</sub>
</div>
