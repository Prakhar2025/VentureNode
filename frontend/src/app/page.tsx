"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  Lightbulb, TrendingUp, Map, CheckSquare,
  Activity, ArrowRight, Wifi, WifiOff, BarChart3, Zap
} from "lucide-react";
import Link from "next/link";
import Sidebar from "@/components/Sidebar";
import IdeaSubmitForm from "@/components/IdeaSubmitForm";
import { StatCard, AgentTimeline, EmptyState } from "@/components/ui";
import {
  getHealth, getIdeas, getTasks,
  type HealthResponse, type NotionListResponse,
  extractText, extractSelect,
} from "@/lib/api";

const AGENT_PIPELINE = [
  { agent: "Idea Analyzer", status: "idle" as const, message: "Waiting for idea submission..." },
  { agent: "Market Research", status: "idle" as const, message: "DuckDuckGo OSINT + BeautifulSoup scraper on standby" },
  { agent: "Roadmap Generator", status: "idle" as const, message: "Ready to plan 3-phase product roadmap" },
  { agent: "Task Planner", status: "idle" as const, message: "Will create Notion-linked execution tasks" },
  { agent: "Execution Monitor", status: "idle" as const, message: "Tracks completion and generates reports" },
];

export default function DashboardPage() {
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [ideas, setIdeas] = useState<NotionListResponse | null>(null);
  const [tasks, setTasks] = useState<NotionListResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeRunId, setActiveRunId] = useState<string | null>(null);
  const [pipelineStatus, setPipelineStatus] = useState<string>("idle");
  const [currentStep, setCurrentStep] = useState<string>("idle");

  useEffect(() => {
    async function load() {
      try {
        const [h, i, t] = await Promise.allSettled([
          getHealth(), getIdeas(), getTasks()
        ]);
        if (h.status === "fulfilled") setHealth(h.value);
        if (i.status === "fulfilled") setIdeas(i.value);
        if (t.status === "fulfilled") setTasks(t.value);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  // Poll workflow status
  useEffect(() => {
    if (!activeRunId || pipelineStatus === "done" || pipelineStatus === "error") return;

    const intervalId = setInterval(async () => {
      try {
        const { getWorkflowStatus } = await import("@/lib/api");
        const statusData = await getWorkflowStatus(activeRunId);
        
        if (statusData) {
          setPipelineStatus(statusData.status);
          setCurrentStep(statusData.step ?? "idle");
        }
      } catch (e) {
        console.error("Polling failed", e);
      }
    }, 2000);

    return () => clearInterval(intervalId);
  }, [activeRunId, pipelineStatus]);

  function getLivePipelineSteps() {
    if (!activeRunId) return AGENT_PIPELINE;
    
    // Map backend LangGraph steps to our frontend index
    const stepOrder = [
      "initializing", 
      "idea_analyzer", 
      "idea_approval_checkpoint", 
      "idea_approved",
      "market_research", 
      "research_approval_checkpoint",
      "research_approved",
      "roadmap_generator", 
      "task_planner", 
      "execution_monitor", 
      "memory_stored", 
      "pipeline_end"
    ];
    
    const currentIndex = stepOrder.indexOf(currentStep);
    
    return AGENT_PIPELINE.map((step, idx) => {
      let status: "idle" | "running" | "done" | "error" = "idle";
      
      // Node mapping
      const isAnalyzer = idx === 0 && currentIndex >= stepOrder.indexOf("idea_analyzer");
      const isResearch = idx === 1 && currentIndex >= stepOrder.indexOf("market_research");
      const isRoadmap = idx === 2 && currentIndex >= stepOrder.indexOf("roadmap_generator");
      const isTasks = idx === 3 && currentIndex >= stepOrder.indexOf("task_planner");
      const isMonitor = idx === 4 && currentIndex >= stepOrder.indexOf("execution_monitor");
      
      const isAnalyzerDone = currentIndex >= stepOrder.indexOf("market_research");
      const isResearchDone = currentIndex >= stepOrder.indexOf("roadmap_generator");
      const isRoadmapDone = currentIndex >= stepOrder.indexOf("task_planner");
      const isTasksDone = currentIndex >= stepOrder.indexOf("execution_monitor");
      const isMonitorDone = currentIndex >= stepOrder.indexOf("pipeline_end");

      if (pipelineStatus === "error" && ((idx === 0 && !isAnalyzerDone) || (idx === 1 && !isResearchDone) || (idx === 2 && !isRoadmapDone) || (idx === 3 && !isTasksDone) || (idx === 4 && !isMonitorDone))) {
         status = "error";
      } else if (idx === 0) {
         status = isAnalyzerDone ? "done" : isAnalyzer ? "running" : "idle";
      } else if (idx === 1) {
         status = isResearchDone ? "done" : isResearch ? "running" : "idle";
      } else if (idx === 2) {
         status = isRoadmapDone ? "done" : isRoadmap ? "running" : "idle";
      } else if (idx === 3) {
         status = isTasksDone ? "done" : isTasks ? "running" : "idle";
      } else if (idx === 4) {
         status = isMonitorDone ? "done" : isMonitor ? "running" : "idle";
      }
      
      if (currentStep === "idea_approval_checkpoint" && idx === 0) status = "done"; // Waiting on human
      if (currentStep === "research_approval_checkpoint" && idx === 1) status = "done";

      return { ...step, status };
    });
  }

  const notionConnected = health?.notion?.connected ?? false;
  const totalIdeas = ideas?.count ?? 0;
  const totalTasks = tasks?.count ?? 0;
  const doneTasks = tasks?.results.filter(r => {
    const status = extractSelect(r.properties["Status"]);
    return status === "Done";
  }).length ?? 0;

  const completionRate = totalTasks > 0 ? Math.round((doneTasks / totalTasks) * 100) : 0;

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: "var(--color-bg)" }}>
      <Sidebar />

      {/* Main content */}
      <main style={{ marginLeft: 240, flex: 1, padding: "40px 48px", maxWidth: "100%" }}>
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          style={{ marginBottom: 40 }}
        >
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
            <div>
              <h1 style={{ fontSize: 28, fontWeight: 800, color: "var(--color-text-primary)", letterSpacing: "-0.5px", marginBottom: 6 }}>
                Startup Operating System
              </h1>
              <p style={{ fontSize: 15, color: "var(--color-text-secondary)" }}>
                Your AI co-founder, tracking every step from idea to execution.
              </p>
            </div>

            {/* Notion status badge */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.2 }}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                padding: "8px 16px",
                borderRadius: "var(--radius-full)",
                border: `1px solid ${notionConnected ? "#bbf7d0" : "#fecaca"}`,
                background: notionConnected ? "#f0fdf4" : "#fef2f2",
              }}
            >
              {notionConnected ? (
                <Wifi size={14} color="var(--color-success)" />
              ) : (
                <WifiOff size={14} color="var(--color-error)" />
              )}
              <span style={{
                fontSize: 13,
                fontWeight: 600,
                color: notionConnected ? "var(--color-success)" : "var(--color-error)"
              }}>
                Notion {notionConnected ? "Connected" : "Disconnected"}
              </span>
              {notionConnected && health?.notion?.user && (
                <span style={{ fontSize: 12, color: "#4b7c5a" }}>
                  · {health.notion.user}
                </span>
              )}
            </motion.div>
          </div>

          {/* Breadcrumb */}
          <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, color: "var(--color-text-muted)" }}>
            <Zap size={13} />
            <span>VentureNode</span>
            <span>/</span>
            <span style={{ color: "var(--color-text-primary)", fontWeight: 500 }}>Dashboard</span>
          </div>
        </motion.div>

        {/* Stats row */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16, marginBottom: 32 }}>
          <StatCard label="Ideas Analyzed" value={loading ? "—" : totalIdeas} icon={<Lightbulb size={18} />} delay={0.05} />
          <StatCard label="Tasks Created" value={loading ? "—" : totalTasks} icon={<CheckSquare size={18} />} delay={0.1} color="var(--color-success)" />
          <StatCard label="Task Completion" value={loading ? "—" : `${completionRate}%`} icon={<BarChart3 size={18} />} delay={0.15} color="var(--color-accent)" />
          <StatCard label="Backend Version" value={health?.version ?? "—"} icon={<Activity size={18} />} delay={0.2} color="var(--color-warning)" />
        </div>

        {/* Two-column grid */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24, marginBottom: 32 }}>
          {/* Idea submission */}
          <IdeaSubmitForm onWorkflowStarted={(runId) => setActiveRunId(runId)} />

          {/* Agent pipeline */}
          <div className="card" style={{ padding: 28, position: "relative" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20 }}>
              <Activity size={18} color="var(--color-brand)" />
              <h2 style={{ fontWeight: 700, fontSize: 16, color: "var(--color-text-primary)" }}>
                Agent Pipeline
              </h2>
              {activeRunId && (
                <span style={{
                  marginLeft: "auto",
                  fontSize: 11,
                  padding: "3px 10px",
                  background: "var(--color-brand-light)",
                  border: "1px solid var(--color-brand-border)",
                  borderRadius: "var(--radius-full)",
                  color: "var(--color-brand)",
                  fontWeight: 600,
                }}>
                  LIVE
                </span>
              )}
            </div>
            
            <AgentTimeline steps={getLivePipelineSteps()} />
            
            {activeRunId && pipelineStatus === "running" && (
              <div style={{
                position: "absolute",
                bottom: 24,
                right: 28,
                fontSize: 11,
                color: "var(--color-text-muted)",
                display: "flex",
                alignItems: "center",
                gap: 6
              }}>
                <span className="pulsing-dot" style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--color-brand)" }} />
                Polling status...
              </div>
            )}
          </div>
        </div>

        {/* Quick links */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <h3 style={{ fontWeight: 600, fontSize: 15, color: "var(--color-text-primary)", marginBottom: 16 }}>
            Workspace Views
          </h3>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12 }}>
            {[
              { href: "/ideas", label: "Ideas", icon: Lightbulb, desc: "AI-scored startup concepts", color: "var(--color-brand)" },
              { href: "/research", label: "Research", icon: TrendingUp, desc: "Live market intelligence", color: "var(--color-accent)" },
              { href: "/roadmap", label: "Roadmap", icon: Map, desc: "3-phase product plan", color: "var(--color-success)" },
              { href: "/tasks", label: "Tasks", icon: CheckSquare, desc: "Execution task board", color: "var(--color-warning)" },
            ].map(({ href, label, icon: Icon, desc, color }, i) => (
              <motion.div key={href} whileHover={{ y: -3 }} whileTap={{ scale: 0.97 }}>
                <Link href={href} style={{ textDecoration: "none" }}>
                  <div className="card" style={{ padding: "20px 18px", cursor: "pointer" }}>
                    <div style={{
                      width: 36, height: 36,
                      borderRadius: "var(--radius-md)",
                      background: `${color}15`,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      color, marginBottom: 12,
                    }}>
                      <Icon size={18} />
                    </div>
                    <p style={{ fontWeight: 600, fontSize: 14, color: "var(--color-text-primary)", marginBottom: 4 }}>{label}</p>
                    <p style={{ fontSize: 12, color: "var(--color-text-muted)", lineHeight: 1.4 }}>{desc}</p>
                    <div style={{ display: "flex", alignItems: "center", gap: 4, marginTop: 12, color: "var(--color-brand)" }}>
                      <span style={{ fontSize: 12, fontWeight: 500 }}>View</span>
                      <ArrowRight size={12} />
                    </div>
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </main>
    </div>
  );
}
