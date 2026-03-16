# VentureNode Architecture

## High-Level System Architecture

VentureNode uses a **multi-agent orchestration architecture**, converting raw ideas into structured execution by running multiple specialized AI agents over a Notion workspace. 

### Data Flow Pipeline
1. **User Interface (Next.js Dashboard):** 
   - Commands the system.
   - Triggers the Backend API.
2. **API Layer (FastAPI):**
   - Receives events and routes them to the proper orchestration workflows.
3. **Agent Orchestration Engine (LangGraph):**
   - Defines state-transitions and tool utilization for specialized AI agents.
4. **Memory + Context System (FAISS Vector Store):**
   - Retains conversational history and historical research intelligence.
5. **Notion Open-Source MCP Server:**
   - Interprets read/write CRUD commands into Notion Blocks, Tables, and Databases.

## Agent Specifications

### 1. Idea Analyzer Agent
- **Input**: Startup Idea Description.
- **Functions**: Synthesize opportunity clarity, evaluate risk score.
- **Output**: Writes structured analysis to Notion `Ideas` Database. 

### 2. Market Research Agent
- **Tools**: DuckDuckGo API, BeautifulSoup web scraping.
- **Functions**: Scrape web for competitor analysis, organize trends.
- **Output**: Creates a comprehensive page in Notion `Research` Database.

### 3. Roadmap Generator Agent
- **Input**: Idea and Research records.
- **Functions**: Creates execution phases and logic flows.
- **Output**: Populates Notion `Roadmap` Database with actionable steps.

### 4. Task Planning Agent
- **Functions**: Extrapolates detailed technical/business tasks from the roadmap.
- **Output**: Populates Notion `Tasks` Database with statuses and priorities.

### 5. Execution Monitoring Agent
- **Functions**: Detects execution bottlenecks, aggregates completed items, and compiles performance summaries.
- **Output**: Publishes analytical reports to Notion `Reports` Database.

## Notion Database Schemas

These databases MUST exist in the user's Notion workspace for VentureNode to map attributes.

- **Ideas**: Notion Columns (Idea Name, Description, Opportunity Score, Risk Score, Status, Date)
- **Research**: Notion Columns (Topic, Summary, Sources, Confidence, Related Idea [Relation])
- **Roadmap**: Notion Columns (Feature Name, Priority, Phase, Status, Owner)
- **Tasks**: Notion Columns (Task Title, Description, Priority, Deadline, Status, Assigned Agent, Related Feature [Relation])
- **Reports**: Notion Columns (Report Title, Date, Summary, Insights, Recommendations)
