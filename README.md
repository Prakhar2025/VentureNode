# VentureNode

**VentureNode** is an autonomous AI-powered operating system for startups that utilizes Notion as its primary operational database. It orchestrates multiple specialized AI agents using LangGraph to analyze ideas, conduct market research, generate roadmaps, plan tasks, and monitor execution.

This is a submission for the **Notion MCP Challenge**.

## Project Motivation
Early-stage founders struggle with organizing ideas, market validation, planning roadmaps, tracking execution, and managing tasks. Most tools (Notion, Trello, Jira) are passive. VentureNode transforms Notion into an **active AI-driven system** that assists founders continuously with a human-in-the-loop mechanism.

## Features
- **Multi-Agent Architecture**: Specialized AI agents (Idea Analyzer, Market Research, Roadmap Generator, Task Planner, Execution Monitor) perform varied tasks.
- **Notion MCP Integration**: Agents interact with a Notion workspace to read and write structured data in databases.
- **Agent Orchestration**: LangGraph coordinates workflows between the AI agents.
- **Frontend Dashboard**: A robust Next.js command center for the founder to view analytics, agent activity logs, and system controls.

## Tech Stack
### Backend
- **Python / FastAPI**: High-performance API layer.
- **LangGraph / LangChain**: For cyclical, stateful agent workflows.
- **Groq API**: Blazing-fast LLM inference.
- **DuckDuckGo API**: Free OSINT and Web Search.
- **FAISS**: Local Vector Database for memory retrieval.
- **Notion Open-Source MCP**: Seamless Notion Workspace integration.

### Frontend
- **Next.js 14 (App Router)**: Frontend framework.
- **Tailwind CSS**: Utility-first CSS framework.
- **Shadcn UI**: Unstyled, accessible React components.
- **Framer Motion**: Smooth animations.

## Development Setup

The development is divided into strategic milestones.

### Phase 1: Backend Setup
- Initialize FastAPI backend.
- Configure Notion MCP client and Groq LLM integration.

### Phase 2: Agent Orchestration (LangGraph)
- Build individual agents execution logic.
- Connect agents sequentially via LangGraph.

### Phase 3: Frontend Setup
- Initialize Next.js Dashboard.
- Build visualizations for Notion Database states.

### Phase 4: Integration & Testing
- Connect FastAPI with Next.js.
- Perform end-to-end trials with the live Notion Workspace.

*Refer to the `/docs` directory for complete architectural specifications.*
