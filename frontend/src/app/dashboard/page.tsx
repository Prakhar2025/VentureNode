"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  Lightbulb, TrendingUp, Map, CheckSquare,
  Activity, ArrowRight, Wifi, WifiOff, BarChart3, Zap,
  Sparkles,
} from "lucide-react";
import Link from "next/link";
import { useAuth } from "@clerk/nextjs";
import Sidebar from "@/components/Sidebar";
import IdeaSubmitForm from "@/components/IdeaSubmitForm";
import { StatCard, AgentTimeline, GlassCard, SectionHeader } from "@/components/ui";
import {
  getHealth, getIdeas, getTasks,
  type HealthResponse, type NotionListResponse,
  extractSelect,
} from "@/lib/api";

// --------------------------------------------------------------------- //
// Agent pipeline config                                                  //
// --------------------------------------------------------------------- //

const AGENT_PIPELINE = [
  { agent: "Idea Analyzer", status: "idle" as const, message: "Waiting for idea submission..." },
  { agent: "Market Research", status: "idle" as const, message: "DuckDuckGo OSINT + BeautifulSoup on standby" },
  { agent: "Roadmap Generator", status: "idle" as const, message: "Ready to plan 3-phase product roadmap" },
  { agent: "Task Planner", status: "idle" as const, message: "Will create Kanban board + Notion tasks" },
  { agent: "Execution Monitor", status: "idle" as const, message: "Tracks completion, generates reports" },
];

const STEP_ORDER = [
  "initializing", "idea_analyzer", "idea_approval_checkpoint", "idea_approved",
  "market_research", "research_approval_checkpoint", "research_approved",
  "roadmap_generator", "task_planner", "execution_monitor", "memory_stored", "pipeline_end",
];

const WORKSPACE_LINKS = [
  { href: "/ideas",    label: "Ideas",    icon: Lightbulb,   desc: "AI-scored startup concepts",   color: "#7C3AED" },
  { href: "/research", label: "Research", icon: TrendingUp,  desc: "Live market intelligence",     color: "#06B6D4" },
  { href: "/roadmap",  label: "Roadmap",  icon: Map,         desc: "3-phase product plan",         color: "#10B981" },
  { href: "/tasks",    label: "Tasks",    icon: CheckSquare, desc: "Execution task board",         color: "#F59E0B" },
];

// --------------------------------------------------------------------- //
// Main Dashboard                                                         //
// --------------------------------------------------------------------- //

export default function DashboardPage() {
  const { getToken } = useAuth();
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [ideas, setIdeas] = useState<NotionListResponse | null>(null);
  const [tasks, setTasks] = useState<NotionListResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeRunId, setActiveRunId] = useState<string | null>(null);
  const [pipelineStatus, setPipelineStatus] = useState<string>("idle");
  const [currentStep, setCurrentStep] = useState<string>("idle");

  // Initial data load
  useEffect(() => {
    async function load() {
      try {
        const token = (await getToken()) ?? "";
        const [h, i, t] = await Promise.allSettled([
          getHealth(),
          getIdeas(token),
          getTasks(token),
        ]);
        if (h.status === "fulfilled") setHealth(h.value);
        if (i.status === "fulfilled") setIdeas(i.value);
        if (t.status === "fulfilled") setTasks(t.value);
      } finally {
        setLoading(false);
      }
    }
    load();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Poll workflow status
  useEffect(() => {
    if (!activeRunId || pipelineStatus === "done" || pipelineStatus === "error") return;
    const id = setInterval(async () => {
      try {
        const { getWorkflowStatus } = await import("@/lib/api");
        const token = (await getToken()) ?? "";
        const s = await getWorkflowStatus(activeRunId, token);
        if (s) { setPipelineStatus(s.status); setCurrentStep(s.step ?? "idle"); }
      } catch { /* non-fatal */ }
    }, 2000);
    return () => clearInterval(id);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeRunId, pipelineStatus]);

  function getLivePipelineSteps() {
    if (!activeRunId) return AGENT_PIPELINE;
    const idx = STEP_ORDER.indexOf(currentStep);
    return AGENT_PIPELINE.map((step, i) => {
      const thresholds = [
        STEP_ORDER.indexOf("idea_analyzer"),
        STEP_ORDER.indexOf("market_research"),
        STEP_ORDER.indexOf("roadmap_generator"),
        STEP_ORDER.indexOf("task_planner"),
        STEP_ORDER.indexOf("execution_monitor"),
      ];
      const doneThresholds = [
        STEP_ORDER.indexOf("market_research"),
        STEP_ORDER.indexOf("roadmap_generator"),
        STEP_ORDER.indexOf("task_planner"),
        STEP_ORDER.indexOf("execution_monitor"),
        STEP_ORDER.indexOf("pipeline_end"),
      ];
      let status: "idle" | "running" | "done" | "error" = "idle";
      if (pipelineStatus === "error") {
        status = "error";
      } else if (idx >= doneThresholds[i]) {
        status = "done";
      } else if (idx >= thresholds[i]) {
        status = "running";
      }
      if (currentStep === "idea_approval_checkpoint" && i === 0) status = "done";
      if (currentStep === "research_approval_checkpoint" && i === 1) status = "done";
      return { ...step, status };
    });
  }

  const notionConnected = health?.notion?.connected ?? false;
  const totalIdeas    = ideas?.count ?? 0;
  const totalTasks    = tasks?.count ?? 0;
  const doneTasks     = tasks?.results.filter((r) => extractSelect(r.properties["Status"]) === "Done").length ?? 0;
  const completionRate = totalTasks > 0 ? Math.round((doneTasks / totalTasks) * 100) : 0;

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: "#F8F9FC", position: "relative", zIndex: 1 }}>
      <Sidebar />

      {/* Main content */}
      <main
        style={{
          marginLeft: 256,
          flex: 1,
          padding: "40px 48px 64px",
          maxWidth: "100%",
          minHeight: "100vh",
          position: "relative",
          zIndex: 1,
        }}
      >

        {/* ============================================================ */}
        {/* TOP HEADER                                                     */}
        {/* ============================================================ */}
        <motion.div
          initial={{ opacity: 0, y: -14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          style={{ marginBottom: 40 }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "flex-start",
              justifyContent: "space-between",
              gap: 24,
              marginBottom: 12,
            }}
          >
            <div>
              {/* Micro breadcrumb */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  fontSize: 12,
                  color: "#9CA3AF",
                  fontWeight: 500,
                  marginBottom: 8,
                  letterSpacing: "0.02em",
                  textTransform: "uppercase",
                }}
              >
                <Zap size={11} color="#7C3AED" />
                <span style={{ color: "#7C3AED", fontWeight: 600 }}>VentureNode</span>
                <span>/</span>
                <span>Dashboard</span>
              </div>

              <h1
                style={{
                  fontSize: 32,
                  fontWeight: 800,
                  color: "#111827",
                  letterSpacing: "-0.8px",
                  lineHeight: 1.15,
                  marginBottom: 6,
                }}
              >
                Startup Operating
                <span
                  style={{
                    background: "linear-gradient(135deg, #7C3AED 0%, #06B6D4 100%)",
                    WebkitBackgroundClip: "text",
                    WebkitTextFillColor: "transparent",
                    backgroundClip: "text",
                    marginLeft: 10,
                  }}
                >
                  System
                </span>
              </h1>

              <p style={{ fontSize: 15, color: "#6B7280", lineHeight: 1.5 }}>
                Your autonomous AI co-founder — from idea to execution, inside Notion.
              </p>
            </div>

            {/* Notion status pill */}
            <motion.div
              initial={{ opacity: 0, scale: 0.88 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.25 }}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                padding: "10px 18px",
                borderRadius: 999,
                border: `1px solid ${notionConnected ? "#BBF7D0" : "#FECACA"}`,
                background: notionConnected
                  ? "linear-gradient(135deg, #F0FDF4, #ECFDF5)"
                  : "linear-gradient(135deg, #FEF2F2, #FFF1F2)",
                boxShadow: notionConnected
                  ? "0 2px 8px rgba(16,185,129,0.1)"
                  : "0 2px 8px rgba(239,68,68,0.08)",
                flexShrink: 0,
                whiteSpace: "nowrap",
              }}
            >
              {notionConnected ? (
                <Wifi size={14} color="#10B981" />
              ) : (
                <WifiOff size={14} color="#EF4444" />
              )}
              <span
                style={{
                  fontSize: 13,
                  fontWeight: 700,
                  color: notionConnected ? "#065F46" : "#B91C1C",
                }}
              >
                Notion {notionConnected ? "Connected" : "Disconnected"}
              </span>
              {notionConnected && health?.notion?.user && (
                <span style={{ fontSize: 12, color: "#6EE7B7", fontWeight: 500 }}>
                  · {health.notion.user}
                </span>
              )}
            </motion.div>
          </div>
        </motion.div>

        {/* ============================================================ */}
        {/* STATS ROW                                                      */}
        {/* ============================================================ */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(4, 1fr)",
            gap: 16,
            marginBottom: 32,
          }}
        >
          <StatCard
            label="Ideas Analyzed"
            value={loading ? "—" : totalIdeas}
            icon={<Lightbulb size={20} />}
            delay={0.05}
            color="#7C3AED"
            sublabel="Across all runs"
          />
          <StatCard
            label="Tasks Created"
            value={loading ? "—" : totalTasks}
            icon={<CheckSquare size={20} />}
            delay={0.1}
            color="#10B981"
            sublabel="In Notion Tasks DB"
          />
          <StatCard
            label="Task Completion"
            value={loading ? "—" : `${completionRate}%`}
            icon={<BarChart3 size={20} />}
            delay={0.15}
            color="#06B6D4"
            sublabel={`${doneTasks} of ${totalTasks} done`}
          />
          <StatCard
            label="Backend Version"
            value={health?.version ?? "—"}
            icon={<Activity size={20} />}
            delay={0.2}
            color="#F59E0B"
            sublabel={health?.status ?? "checking..."}
          />
        </div>

        {/* ============================================================ */}
        {/* TWO-COLUMN GRID: Submit + Pipeline                            */}
        {/* ============================================================ */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1.05fr 0.95fr",
            gap: 24,
            marginBottom: 32,
            alignItems: "start",
          }}
        >
          <IdeaSubmitForm onWorkflowStarted={(runId) => setActiveRunId(runId)} />

          {/* Agent Pipeline card */}
          <GlassCard padding={28}>
            <SectionHeader
              title="Agent Pipeline"
              subtitle="Live multi-agent execution trace"
              right={
                activeRunId ? (
                  <motion.span
                    animate={{ opacity: [1, 0.5, 1] }}
                    transition={{ duration: 1.5, repeat: Infinity }}
                    style={{
                      fontSize: 10.5,
                      padding: "3px 10px",
                      background: "linear-gradient(135deg, #EDE9FE, #DDD6FE)",
                      border: "1px solid rgba(124,58,237,0.2)",
                      borderRadius: 999,
                      color: "#7C3AED",
                      fontWeight: 700,
                      letterSpacing: "0.06em",
                    }}
                  >
                    ● LIVE
                  </motion.span>
                ) : undefined
              }
            />

            <AgentTimeline steps={getLivePipelineSteps()} />

            {activeRunId && pipelineStatus === "running" && (
              <div
                style={{
                  marginTop: 18,
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  fontSize: 11.5,
                  color: "#9CA3AF",
                  paddingTop: 14,
                  borderTop: "1px solid rgba(0,0,0,0.05)",
                }}
              >
                <span
                  className="pulsing-dot"
                  style={{
                    width: 6,
                    height: 6,
                    borderRadius: "50%",
                    background: "#7C3AED",
                    display: "inline-block",
                  }}
                />
                Polling every 2s • Run {activeRunId.slice(0, 8)}...
              </div>
            )}

            {!activeRunId && (
              <div
                style={{
                  marginTop: 16,
                  padding: "12px 16px",
                  background: "rgba(124,58,237,0.04)",
                  border: "1px solid rgba(124,58,237,0.08)",
                  borderRadius: 12,
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                }}
              >
                <Sparkles size={14} color="#7C3AED" />
                <span style={{ fontSize: 12.5, color: "#7C3AED", fontWeight: 500 }}>
                  Submit an idea to activate the pipeline
                </span>
              </div>
            )}
          </GlassCard>
        </div>

        {/* ============================================================ */}
        {/* WORKSPACE LINKS                                                */}
        {/* ============================================================ */}
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: 16,
            }}
          >
            <h3
              style={{
                fontWeight: 700,
                fontSize: 16,
                color: "#111827",
                letterSpacing: "-0.2px",
              }}
            >
              Workspace Views
            </h3>
            <span style={{ fontSize: 12, color: "#9CA3AF" }}>
              All data synced with Notion
            </span>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(4, 1fr)",
              gap: 14,
            }}
          >
            {WORKSPACE_LINKS.map(({ href, label, icon: Icon, desc, color }, i) => (
              <motion.div
                key={href}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 + i * 0.07, ease: [0.22, 1, 0.36, 1] }}
                whileHover={{ y: -4, scale: 1.02 }}
                whileTap={{ scale: 0.97 }}
              >
                <Link href={href} style={{ textDecoration: "none" }}>
                  <div
                    style={{
                      background: "rgba(255,255,255,0.88)",
                      backdropFilter: "blur(12px)",
                      WebkitBackdropFilter: "blur(12px)",
                      border: "1px solid rgba(0,0,0,0.06)",
                      borderRadius: 18,
                      padding: "22px 20px",
                      cursor: "pointer",
                      boxShadow: "0 0 0 1px rgba(0,0,0,0.04), 0 3px 12px rgba(0,0,0,0.04)",
                      transition: "box-shadow 220ms",
                      height: "100%",
                    }}
                    onMouseEnter={(e) => {
                      (e.currentTarget as HTMLElement).style.boxShadow =
                        `0 0 0 1px ${color}25, 0 8px 24px rgba(0,0,0,0.07)`;
                      (e.currentTarget as HTMLElement).style.borderColor = `${color}25`;
                    }}
                    onMouseLeave={(e) => {
                      (e.currentTarget as HTMLElement).style.boxShadow =
                        "0 0 0 1px rgba(0,0,0,0.04), 0 3px 12px rgba(0,0,0,0.04)";
                      (e.currentTarget as HTMLElement).style.borderColor = "rgba(0,0,0,0.06)";
                    }}
                  >
                    {/* Icon */}
                    <div
                      style={{
                        width: 42,
                        height: 42,
                        borderRadius: 13,
                        background: `${color}14`,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        color,
                        marginBottom: 16,
                      }}
                    >
                      <Icon size={20} />
                    </div>

                    <p
                      style={{
                        fontWeight: 700,
                        fontSize: 15,
                        color: "#111827",
                        marginBottom: 4,
                        letterSpacing: "-0.2px",
                      }}
                    >
                      {label}
                    </p>
                    <p
                      style={{
                        fontSize: 12.5,
                        color: "#9CA3AF",
                        lineHeight: 1.45,
                        marginBottom: 16,
                      }}
                    >
                      {desc}
                    </p>

                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 4,
                        color,
                        fontSize: 12.5,
                        fontWeight: 600,
                      }}
                    >
                      <span>Open view</span>
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
