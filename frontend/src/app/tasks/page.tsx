"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@clerk/nextjs";
import { motion } from "framer-motion";
import { CheckSquare, RefreshCw, XCircle, Clock, AlertCircle, CheckCircle2, Inbox } from "lucide-react";
import Sidebar from "@/components/Sidebar";
import { EmptyState, Skeleton } from "@/components/ui";
import { getTasks, extractText, extractSelect, type NotionRecord } from "@/lib/api";

const STATUS_CONFIG: Record<string, { label: string; icon: typeof CheckCircle2; color: string; bg: string }> = {
  "Done":        { label: "Done",        icon: CheckCircle2,  color: "#10b981", bg: "#f0fdf4" },
  "In Progress": { label: "In Progress", icon: Clock,         color: "#6366f1", bg: "#eef2ff" },
  "Blocked":     { label: "Blocked",     icon: AlertCircle,   color: "#ef4444", bg: "#fef2f2" },
  "Backlog":     { label: "Backlog",     icon: Inbox,         color: "#9ca3af", bg: "#f9fafb" },
};

const PRIORITY_COLOR: Record<string, { color: string; bg: string }> = {
  P0: { color: "#ef4444", bg: "#fee2e2" },
  P1: { color: "#f59e0b", bg: "#fef3c7" },
  P2: { color: "#6b7280", bg: "#f3f4f6" },
};

function TaskCard({ record, index }: { record: NotionRecord; index: number }) {
  const props = record.properties;
  const title = extractText(props["Task Title"] ?? props["Name"]);
  const description = extractText(props["Description"]);
  const status = extractSelect(props["Status"], "Backlog");
  const priority = extractSelect(props["Priority"], "P2");
  const agent = extractText(props["Assigned Agent"], "Human");
  const deadline = (props["Deadline"] as { date?: { start?: string } })?.date?.start ?? "";

  const statusCfg = STATUS_CONFIG[status] ?? STATUS_CONFIG["Backlog"];
  const pCfg = PRIORITY_COLOR[priority] ?? PRIORITY_COLOR.P2;
  const StatusIcon = statusCfg.icon;

  const isOverdue = deadline
    ? new Date(deadline) < new Date() && status !== "Done"
    : false;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: index * 0.04 }}
      className="card"
      style={{ padding: 20 }}
    >
      <div style={{ display: "flex", alignItems: "flex-start", gap: 14 }}>
        <div style={{
          width: 32, height: 32, borderRadius: "var(--radius-md)", background: statusCfg.bg,
          display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: 2,
        }}>
          <StatusIcon size={15} color={statusCfg.color} />
        </div>

        <div style={{ flex: 1 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, marginBottom: 4 }}>
            <p style={{ fontWeight: 600, fontSize: 14, color: "var(--color-text-primary)", lineHeight: 1.4 }}>
              {title}
            </p>
            <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
              <span style={{ fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: "var(--radius-full)", background: pCfg.bg, color: pCfg.color }}>
                {priority}
              </span>
              <span style={{ fontSize: 11, fontWeight: 600, padding: "2px 8px", borderRadius: "var(--radius-full)", background: statusCfg.bg, color: statusCfg.color }}>
                {statusCfg.label}
              </span>
            </div>
          </div>

          {description && (
            <p style={{ fontSize: 12, color: "var(--color-text-muted)", lineHeight: 1.5, marginBottom: 10 }}>
              {description.slice(0, 200)}{description.length > 200 ? "..." : ""}
            </p>
          )}

          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            {agent && <span style={{ fontSize: 11, color: "var(--color-text-muted)" }}>→ {agent}</span>}
            {deadline && (
              <span style={{ fontSize: 11, color: isOverdue ? "var(--color-error)" : "var(--color-text-muted)", fontWeight: isOverdue ? 600 : 400 }}>
                {isOverdue ? "⚠ Overdue: " : "Due: "}{new Date(deadline).toLocaleDateString()}
              </span>
            )}
            <a href={record.url} target="_blank" rel="noopener noreferrer" style={{ marginLeft: "auto", fontSize: 11, color: "var(--color-brand)", fontWeight: 500, textDecoration: "none" }}>
              Notion →
            </a>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

export default function TasksPage() {
  const { getToken } = useAuth();
  const [tasks, setTasks] = useState<NotionRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<string>("All");

  async function load() {
    setLoading(true); setError(null);
    try {
      const token = (await getToken()) ?? "";
      const d = await getTasks(token);
      setTasks(d.results);
    }
    catch (e) { setError(e instanceof Error ? e.message : "Failed"); }
    finally { setLoading(false); }
  }
  useEffect(() => { load(); }, []);

  const statuses = ["All", "Backlog", "In Progress", "Blocked", "Done"];
  const filtered = filter === "All" ? tasks : tasks.filter(r => extractSelect(r.properties["Status"]) === filter);
  const done = tasks.filter(r => extractSelect(r.properties["Status"]) === "Done").length;
  const completionRate = tasks.length > 0 ? Math.round((done / tasks.length) * 100) : 0;

  return (
    <div style={{ display: "flex", minHeight: "100vh" }}>
      <Sidebar />
      <main style={{ marginLeft: 240, flex: 1, padding: "40px 48px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 24 }}>
          <div>
            <h1 style={{ fontSize: 26, fontWeight: 800, letterSpacing: "-0.4px", marginBottom: 4 }}>Tasks</h1>
            <p style={{ fontSize: 14, color: "var(--color-text-secondary)" }}>
              {loading ? "Loading..." : `${done}/${tasks.length} completed · ${completionRate}% done`}
            </p>
          </div>
          <button onClick={load} style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 16px", borderRadius: "var(--radius-md)", border: "1px solid var(--color-border)", background: "white", fontSize: 13, cursor: "pointer" }}>
            <RefreshCw size={14} />Refresh
          </button>
        </div>

        {/* Progress bar */}
        {!loading && tasks.length > 0 && (
          <div style={{ background: "var(--color-surface)", borderRadius: "var(--radius-full)", height: 6, marginBottom: 24, overflow: "hidden" }}>
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${completionRate}%` }}
              transition={{ duration: 0.8, ease: "easeOut" }}
              style={{ height: "100%", background: "linear-gradient(90deg, #6366f1, #06b6d4)", borderRadius: "var(--radius-full)" }}
            />
          </div>
        )}

        {/* Filter tabs */}
        <div style={{ display: "flex", gap: 6, marginBottom: 24 }}>
          {statuses.map(s => (
            <button key={s} onClick={() => setFilter(s)} style={{
              padding: "6px 14px", borderRadius: "var(--radius-full)", border: "1px solid",
              borderColor: filter === s ? "var(--color-brand)" : "var(--color-border)",
              background: filter === s ? "var(--color-brand-light)" : "white",
              color: filter === s ? "var(--color-brand)" : "var(--color-text-secondary)",
              fontSize: 13, fontWeight: filter === s ? 600 : 400, cursor: "pointer",
              transition: "all var(--transition-fast)",
            }}>
              {s} {s !== "All" && !loading && <span style={{ fontSize: 11 }}>({tasks.filter(r => extractSelect(r.properties["Status"]) === s).length})</span>}
              {s === "All" && !loading && <span style={{ fontSize: 11 }}> ({tasks.length})</span>}
            </button>
          ))}
        </div>

        {loading ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {[1,2,3].map(i => <div key={i} className="card" style={{ padding: 20 }}><div style={{display:"flex",gap:14}}><Skeleton width={32} height={32} rounded /><div style={{flex:1,display:"flex",flexDirection:"column",gap:8}}><Skeleton width="60%" height={16} /><Skeleton height={12} /></div></div></div>)}
          </div>
        ) : error ? (
          <div style={{ padding: 24, borderRadius: "var(--radius-lg)", background: "#fef2f2", border: "1px solid #fecaca" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}><XCircle size={16} color="#ef4444" /><span style={{ fontSize: 14, color: "#991b1b" }}>{error}</span></div>
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState icon={<CheckSquare size={28} />} title={filter === "All" ? "No Tasks Yet" : `No ${filter} Tasks`} description={filter === "All" ? "Tasks will be created by the Task Planner Agent and linked to your roadmap milestones." : `No tasks with status '${filter}' found.`} />
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {filtered.map((r, i) => <TaskCard key={r.id} record={r} index={i} />)}
          </div>
        )}
      </main>
    </div>
  );
}
