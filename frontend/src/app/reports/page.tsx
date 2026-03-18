"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { BarChart3, RefreshCw, XCircle, TrendingUp, CheckCircle2, AlertTriangle, Clock } from "lucide-react";
import Sidebar from "@/components/Sidebar";
import { EmptyState, Skeleton } from "@/components/ui";
import { getHealth, extractText, extractSelect, extractNumber, type NotionRecord } from "@/lib/api";
import axios from "axios";

const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api/v1";

async function getReports(): Promise<{ count: number; results: NotionRecord[] }> {
  const { data } = await axios.get(`${BASE_URL}/notion/reports`);
  return data;
}

function MetricPill({ label, value, color }: { label: string; value: string | number; color: string }) {
  return (
    <div style={{
      padding: "14px 20px",
      borderRadius: "var(--radius-md)",
      background: `${color}10`,
      border: `1px solid ${color}30`,
      textAlign: "center",
    }}>
      <p style={{ fontSize: 22, fontWeight: 800, color, marginBottom: 2 }}>{value}</p>
      <p style={{ fontSize: 11, color: "var(--color-text-muted)", fontWeight: 500 }}>{label}</p>
    </div>
  );
}

function ReportCard({ record, index }: { record: NotionRecord; index: number }) {
  const props = record.properties;
  const title = extractText(props["Report Title"] ?? props["Name"]);
  const summary = extractText(props["Executive Summary"] ?? props["Summary"]);
  const completionRate = extractNumber(props["Completion Rate"]);
  const overdueCount = extractNumber(props["Overdue Tasks"]);
  const blockedCount = extractNumber(props["Blocked Tasks"]);
  const totalTasks = extractNumber(props["Total Tasks"]);

  const createdDate = new Date(record.created_time).toLocaleDateString("en-US", {
    year: "numeric", month: "short", day: "numeric",
  });

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: index * 0.07 }}
      className="card"
      style={{ padding: 28 }}
    >
      {/* Report header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{
            width: 40, height: 40, borderRadius: "var(--radius-md)",
            background: "linear-gradient(135deg, #6366f1 0%, #06b6d4 100%)",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <BarChart3 size={18} color="white" />
          </div>
          <div>
            <h3 style={{ fontWeight: 700, fontSize: 16, color: "var(--color-text-primary)", marginBottom: 2 }}>
              {title}
            </h3>
            <span style={{ fontSize: 12, color: "var(--color-text-muted)" }}>Generated {createdDate}</span>
          </div>
        </div>
        <a href={record.url} target="_blank" rel="noopener noreferrer"
          style={{ fontSize: 12, color: "var(--color-brand)", fontWeight: 500, textDecoration: "none", flexShrink: 0 }}>
          Open in Notion →
        </a>
      </div>

      {/* Metrics row */}
      {(totalTasks > 0 || completionRate > 0) && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 20 }}>
          <MetricPill label="Total Tasks" value={totalTasks} color="#6366f1" />
          <MetricPill label="Completion" value={`${completionRate}%`} color="#10b981" />
          <MetricPill label="Overdue" value={overdueCount} color="#ef4444" />
          <MetricPill label="Blocked" value={blockedCount} color="#f59e0b" />
        </div>
      )}

      {/* Summary */}
      {summary && (
        <div style={{
          padding: "16px 18px",
          borderRadius: "var(--radius-md)",
          background: "var(--color-surface)",
          border: "1px solid var(--color-border)",
        }}>
          <p style={{ fontSize: 13, color: "var(--color-text-secondary)", lineHeight: 1.7 }}>
            {summary}
          </p>
        </div>
      )}

      {/* Status summary */}
      <div style={{ display: "flex", gap: 16, marginTop: 16 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <CheckCircle2 size={14} color="#10b981" />
          <span style={{ fontSize: 12, color: "var(--color-text-muted)" }}>
            {Math.round((completionRate / 100) * totalTasks) || 0} done
          </span>
        </div>
        {overdueCount > 0 && (
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <Clock size={14} color="#ef4444" />
            <span style={{ fontSize: 12, color: "#ef4444", fontWeight: 500 }}>{overdueCount} overdue</span>
          </div>
        )}
        {blockedCount > 0 && (
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <AlertTriangle size={14} color="#f59e0b" />
            <span style={{ fontSize: 12, color: "#f59e0b", fontWeight: 500 }}>{blockedCount} blocked</span>
          </div>
        )}
      </div>
    </motion.div>
  );
}

export default function ReportsPage() {
  const [reports, setReports] = useState<NotionRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);

  async function load() {
    setLoading(true); setError(null);
    try { const d = await getReports(); setReports(d.results); }
    catch (e) { setError(e instanceof Error ? e.message : "Failed to load reports"); }
    finally { setLoading(false); }
  }

  async function handleGenerateReport() {
    setGenerating(true);
    try {
      await axios.post(`${BASE_URL}/monitor/report`);
      setTimeout(load, 3000);
    } catch {
      setError("Failed to trigger report. Make sure the backend is running.");
    } finally {
      setGenerating(false);
    }
  }

  useEffect(() => { load(); }, []);

  return (
    <div style={{ display: "flex", minHeight: "100vh" }}>
      <Sidebar />
      <main style={{ marginLeft: 240, flex: 1, padding: "40px 48px" }}>
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 32 }}>
          <div>
            <h1 style={{ fontSize: 26, fontWeight: 800, letterSpacing: "-0.4px", marginBottom: 4 }}>Reports</h1>
            <p style={{ fontSize: 14, color: "var(--color-text-secondary)" }}>
              {loading ? "Loading..." : `${reports.length} execution report${reports.length !== 1 ? "s" : ""} generated by AI`}
            </p>
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            <button onClick={load} disabled={loading} style={{
              display: "flex", alignItems: "center", gap: 6, padding: "8px 16px",
              borderRadius: "var(--radius-md)", border: "1px solid var(--color-border)",
              background: "white", fontSize: 13, fontWeight: 500, cursor: "pointer",
              color: "var(--color-text-secondary)",
            }}>
              <RefreshCw size={14} />Refresh
            </button>
            <motion.button
              whileTap={{ scale: 0.97 }}
              onClick={handleGenerateReport}
              disabled={generating}
              style={{
                display: "flex", alignItems: "center", gap: 6, padding: "8px 18px",
                borderRadius: "var(--radius-md)", border: "none",
                background: generating ? "var(--color-surface-2)" : "linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)",
                color: generating ? "var(--color-text-muted)" : "white",
                fontSize: 13, fontWeight: 600, cursor: generating ? "not-allowed" : "pointer",
                boxShadow: generating ? "none" : "0 4px 12px rgb(99 102 241 / 0.25)",
              }}
            >
              <TrendingUp size={14} />
              {generating ? "Generating..." : "Generate Report"}
            </motion.button>
          </div>
        </div>

        {error && (
          <div style={{ padding: 16, borderRadius: "var(--radius-md)", background: "#fef2f2", border: "1px solid #fecaca", marginBottom: 24 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <XCircle size={16} color="#ef4444" />
              <span style={{ fontSize: 13, color: "#991b1b" }}>{error}</span>
            </div>
          </div>
        )}

        {loading ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            {[1, 2].map(i => (
              <div key={i} className="card" style={{ padding: 28 }}>
                <div style={{ display: "flex", gap: 12, marginBottom: 20 }}>
                  <Skeleton width={40} height={40} rounded />
                  <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 8 }}>
                    <Skeleton width="40%" height={18} />
                    <Skeleton width={120} height={12} />
                  </div>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 20 }}>
                  {[1,2,3,4].map(j => <Skeleton key={j} height={64} />)}
                </div>
                <Skeleton height={80} />
              </div>
            ))}
          </div>
        ) : reports.length === 0 ? (
          <EmptyState
            icon={<BarChart3 size={28} />}
            title="No Reports Yet"
            description='The Execution Monitor Agent generates reports automatically. Click "Generate Report" above or wait for the pipeline to complete.'
            action={
              <motion.button
                whileTap={{ scale: 0.97 }}
                onClick={handleGenerateReport}
                style={{
                  padding: "10px 20px", borderRadius: "var(--radius-md)", border: "none",
                  background: "linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)",
                  color: "white", fontSize: 13, fontWeight: 600, cursor: "pointer",
                  boxShadow: "0 4px 12px rgb(99 102 241 / 0.3)",
                }}
              >
                Generate First Report
              </motion.button>
            }
          />
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            {reports.map((r, i) => <ReportCard key={r.id} record={r} index={i} />)}
          </div>
        )}
      </main>
    </div>
  );
}
