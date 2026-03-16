# Notion Workspace Setup Guide

This guide walks you through creating and configuring the Notion workspace that VentureNode uses as its operational database.

---

## Step 1: Create a Notion Internal Integration

1. Go to [https://www.notion.so/my-integrations](https://www.notion.so/my-integrations).
2. Click **+ New Integration**.
3. Name it `VentureNode`.
4. Select your Notion workspace.
5. Set **Capabilities**: Read, Update, Insert content.
6. Click **Submit**.
7. Copy the **Internal Integration Token** — you will add this as `NOTION_TOKEN` in your `.env` file.

---

## Step 2: Create the Required Databases

Create the following databases inside a Notion page you control. After creating each database, click **Share** on the page and add your `VentureNode` integration.

### Database 1: Ideas
| Property Name | Property Type | Notes |
|---|---|---|
| Idea Name | Title | - |
| Description | Rich Text | - |
| Opportunity Score | Number | 1–10 |
| Risk Score | Number | 1–10 |
| Status | Select | `Pending Approval`, `Approved`, `Rejected` |
| Approved | Checkbox | Human approval trigger |
| Date Created | Date | - |

### Database 2: Research
| Property Name | Property Type | Notes |
|---|---|---|
| Topic | Title | - |
| Summary | Rich Text | - |
| Sources | Multi-select | URLs |
| Confidence Level | Select | `High`, `Medium`, `Low` |
| Related Idea | Relation → Ideas | Links back to the Ideas DB |

### Database 3: Roadmap
| Property Name | Property Type | Notes |
|---|---|---|
| Feature Name | Title | - |
| Priority | Select | `High`, `Medium`, `Low` |
| Phase | Number | 1, 2, or 3 |
| Status | Select | `Not Started`, `In Progress`, `Done` |
| Owner | Rich Text | - |

### Database 4: Tasks
| Property Name | Property Type | Notes |
|---|---|---|
| Task Title | Title | - |
| Description | Rich Text | - |
| Priority | Select | `P0`, `P1`, `P2` |
| Deadline | Date | - |
| Status | Select | `Backlog`, `In Progress`, `Blocked`, `Done` |
| Assigned Agent | Select | Agent name |
| Related Feature | Relation → Roadmap | Links to Roadmap DB |

### Database 5: Reports
| Property Name | Property Type | Notes |
|---|---|---|
| Report Title | Title | - |
| Report Date | Date | - |
| Summary | Rich Text | - |
| Insights | Rich Text | - |
| Recommendations | Rich Text | - |

---

## Step 3: Copy the Database IDs

For each database:
1. Open the database as a full page in Notion.
2. Copy the URL. It looks like: `https://notion.so/your-workspace/XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX?v=...`
3. The 32-character string is the **Database ID**.
4. Add each ID to your `backend/.env` file.
