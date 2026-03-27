"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@clerk/nextjs";
import { motion } from "framer-motion";
import { Lightbulb, RefreshCw, CheckCircle, XCircle, Clock } from "lucide-react";
import Sidebar from "@/components/Sidebar";
import { EmptyState, Skeleton } from "@/components/ui";
import { getIdeas, extractText, extractSelect, extractNumber, extractCheckbox, type NotionRecord } from "@/lib/api";

function ScoreBadge({ value, type }: { value: number; type: "opportunity" | "risk" }) {
  const isOpp = type === "opportunity";
  const color = isOpp
    ? value >= 7 ? "#10b981" : value >= 5 ? "#f59e0b" : "#ef4444"
    : value >= 7 ? "#ef4444" : value >= 5 ? "#f59e0b" : "#10b981";
  return (
    <span style={{
      padding: "3px 10px", borderRadius: "var(--radius-full)",
      background: `${color}15`, color, fontSize: 12, fontWeight: 700,
    }}>
      {value.toFixed(1)}
    </span>
  );
}

function IdeaCard({ record, index }: { record: NotionRecord; index: number }) {
  const props = record.properties;
  const name = extractText(props["Idea Name"]);
  const description = extractText(props["Description"] ?? props["Idea Description"]);
  const status = extractSelect(props["Status"], "Pending");
  const opportunityScore = extractNumber(props["Opportunity Score"]);
  const riskScore = extractNumber(props["Risk Score"]);
  const approved = extractCheckbox(props["Approved"]);

  const statusColors: Record<string, string> = {
    "Approved": "#10b981", "Rejected": "#ef4444",
    "Pending Approval": "#f59e0b", "Pending": "#f59e0b",
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: index * 0.06 }}
      className="card"
      style={{ padding: 24 }}
      whileHover={{ y: -2 }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, flex: 1 }}>
          <div style={{
            width: 36, height: 36, borderRadius: "var(--radius-md)",
            background: "var(--color-brand-light)", display: "flex",
            alignItems: "center", justifyContent: "center",
          }}>
            <Lightbulb size={16} color="var(--color-brand)" />
          </div>
          <h3 style={{ fontWeight: 700, fontSize: 15, color: "var(--color-text-primary)", lineHeight: 1.3 }}>
            {name}
          </h3>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0, marginLeft: 12 }}>
          {approved ? (
            <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
              <CheckCircle size={14} color="#10b981" />
              <span style={{ fontSize: 12, color: "#10b981", fontWeight: 600 }}>Approved</span>
            </div>
          ) : (
            <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
              <Clock size={14} color="#f59e0b" />
              <span style={{ fontSize: 12, color: "#f59e0b", fontWeight: 600 }}>Pending</span>
            </div>
          )}
          <span style={{
            fontSize: 11, fontWeight: 600, padding: "2px 8px",
            borderRadius: "var(--radius-full)",
            background: `${statusColors[status] ?? "#6b7280"}15`,
            color: statusColors[status] ?? "#6b7280",
          }}>
            {status}
          </span>
        </div>
      </div>

      {description && (
        <p style={{
          fontSize: 13, color: "var(--color-text-secondary)",
          lineHeight: 1.6, marginBottom: 16,
          display: "-webkit-box", WebkitLineClamp: 3,
          WebkitBoxOrient: "vertical", overflow: "hidden",
        }}>
          {description}
        </p>
      )}

      <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
        {opportunityScore > 0 && (
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ fontSize: 11, color: "var(--color-text-muted)", fontWeight: 500 }}>Opportunity</span>
            <ScoreBadge value={opportunityScore} type="opportunity" />
          </div>
        )}
        {riskScore > 0 && (
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ fontSize: 11, color: "var(--color-text-muted)", fontWeight: 500 }}>Risk</span>
            <ScoreBadge value={riskScore} type="risk" />
          </div>
        )}
        <a
          href={record.url} target="_blank" rel="noopener noreferrer"
          style={{ marginLeft: "auto", fontSize: 12, color: "var(--color-brand)", fontWeight: 500, textDecoration: "none" }}
        >
          Open in Notion →
        </a>
      </div>
    </motion.div>
  );
}

export default function IdeasPage() {
  const { getToken } = useAuth();
  const [ideas, setIdeas] = useState<NotionRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setLoading(true); setError(null);
    try {
      const token = (await getToken()) ?? "";
      const data = await getIdeas(token);
      setIdeas(data.results);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  return (
    <div style={{ display: "flex", minHeight: "100vh" }}>
      <Sidebar />
      <main style={{ marginLeft: 240, flex: 1, padding: "40px 48px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 32 }}>
          <div>
            <h1 style={{ fontSize: 26, fontWeight: 800, color: "var(--color-text-primary)", letterSpacing: "-0.4px", marginBottom: 4 }}>
              Ideas
            </h1>
            <p style={{ fontSize: 14, color: "var(--color-text-secondary)" }}>
              {loading ? "Loading..." : `${ideas.length} idea${ideas.length !== 1 ? "s" : ""} analyzed by AI`}
            </p>
          </div>
          <button onClick={load} style={{
            display: "flex", alignItems: "center", gap: 6, padding: "8px 16px",
            borderRadius: "var(--radius-md)", border: "1px solid var(--color-border)",
            background: "white", fontSize: 13, fontWeight: 500, cursor: "pointer",
            color: "var(--color-text-secondary)",
          }}>
            <RefreshCw size={14} />
            Refresh
          </button>
        </div>

        {loading ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {[1, 2, 3].map(i => (
              <div key={i} className="card" style={{ padding: 24, display: "flex", flexDirection: "column", gap: 12 }}>
                <Skeleton width="40%" height={20} />
                <Skeleton width="100%" height={14} />
                <Skeleton width="80%" height={14} />
              </div>
            ))}
          </div>
        ) : error ? (
          <div style={{ padding: 24, borderRadius: "var(--radius-lg)", background: "#fef2f2", border: "1px solid #fecaca" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <XCircle size={16} color="#ef4444" />
              <span style={{ fontSize: 14, color: "#991b1b", fontWeight: 500 }}>{error}</span>
            </div>
          </div>
        ) : ideas.length === 0 ? (
          <EmptyState
            icon={<Lightbulb size={28} />}
            title="No Ideas Yet"
            description="Submit a startup idea from the Dashboard and the AI pipeline will analyze it and populate this view automatically."
          />
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {ideas.map((record, i) => <IdeaCard key={record.id} record={record} index={i} />)}
          </div>
        )}
      </main>
    </div>
  );
}
