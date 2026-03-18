"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Map, RefreshCw, XCircle } from "lucide-react";
import Sidebar from "@/components/Sidebar";
import { EmptyState, Skeleton } from "@/components/ui";
import { getRoadmap, extractText, extractSelect, extractNumber, type NotionRecord } from "@/lib/api";

const PHASE_COLORS: Record<number, { bg: string; color: string; label: string }> = {
  1: { bg: "#eef2ff", color: "#6366f1", label: "Phase 1 — MVP" },
  2: { bg: "#ecfeff", color: "#06b6d4", label: "Phase 2 — Growth" },
  3: { bg: "#f0fdf4", color: "#10b981", label: "Phase 3 — Scale" },
};

const PRIORITY_COLOR: Record<string, string> = {
  High: "#ef4444", Medium: "#f59e0b", Low: "#10b981",
};

function RoadmapCard({ record, index }: { record: NotionRecord; index: number }) {
  const props = record.properties;
  const name = extractText(props["Feature Name"] ?? props["Name"]);
  const priority = extractSelect(props["Priority"], "Medium");
  const phase = extractNumber(props["Phase"], 1);
  const owner = extractText(props["Owner"]);
  const phaseInfo = PHASE_COLORS[phase] ?? PHASE_COLORS[1];

  return (
    <motion.div
      initial={{ opacity: 0, x: -12 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.3, delay: index * 0.05 }}
      className="card"
      style={{ padding: 20, display: "flex", alignItems: "center", gap: 16 }}
    >
      <div style={{
        width: 44, height: 44, borderRadius: "var(--radius-md)", background: phaseInfo.bg,
        display: "flex", justifyContent: "center", flexShrink: 0,
        flexDirection: "column", alignItems: "center",
      }}>
        <span style={{ fontSize: 16, fontWeight: 800, color: phaseInfo.color, lineHeight: 1 }}>{phase}</span>
        <span style={{ fontSize: 9, fontWeight: 600, color: phaseInfo.color }}>P{phase}</span>
      </div>

      <div style={{ flex: 1 }}>
        <p style={{ fontWeight: 600, fontSize: 14, color: "var(--color-text-primary)", marginBottom: 2 }}>{name}</p>
        {owner && <p style={{ fontSize: 12, color: "var(--color-text-muted)" }}>Owner: {owner}</p>}
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
        <span style={{
          padding: "3px 10px", borderRadius: "var(--radius-full)", fontSize: 11, fontWeight: 600,
          background: `${PRIORITY_COLOR[priority]}15`, color: PRIORITY_COLOR[priority],
        }}>
          {priority}
        </span>
        <span style={{
          padding: "3px 10px", borderRadius: "var(--radius-full)", fontSize: 11, fontWeight: 600,
          background: phaseInfo.bg, color: phaseInfo.color,
        }}>
          {phaseInfo.label}
        </span>
        <a href={record.url} target="_blank" rel="noopener noreferrer"
          style={{ fontSize: 12, color: "var(--color-brand)", fontWeight: 500, textDecoration: "none" }}>
          →
        </a>
      </div>
    </motion.div>
  );
}

export default function RoadmapPage() {
  const [items, setItems] = useState<NotionRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setLoading(true); setError(null);
    try { const d = await getRoadmap(); setItems(d.results); }
    catch (e) { setError(e instanceof Error ? e.message : "Failed"); }
    finally { setLoading(false); }
  }
  useEffect(() => { load(); }, []);

  const phaseGroups = [1, 2, 3].map(p => ({
    phase: p,
    items: items.filter(r => extractNumber(r.properties["Phase"], 1) === p),
    ...PHASE_COLORS[p],
  }));

  return (
    <div style={{ display: "flex", minHeight: "100vh" }}>
      <Sidebar />
      <main style={{ marginLeft: 240, flex: 1, padding: "40px 48px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 32 }}>
          <div>
            <h1 style={{ fontSize: 26, fontWeight: 800, letterSpacing: "-0.4px", marginBottom: 4 }}>Roadmap</h1>
            <p style={{ fontSize: 14, color: "var(--color-text-secondary)" }}>
              {loading ? "Loading..." : `${items.length} milestones across 3 phases`}
            </p>
          </div>
          <button onClick={load} style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 16px", borderRadius: "var(--radius-md)", border: "1px solid var(--color-border)", background: "white", fontSize: 13, cursor: "pointer" }}>
            <RefreshCw size={14} />Refresh
          </button>
        </div>

        {loading ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {[1,2,3,4].map(i => <div key={i} className="card" style={{ padding: 20, display: "flex", gap: 16 }}><Skeleton width={44} height={44} rounded /><div style={{flex:1}}><Skeleton width="50%" height={16} /></div></div>)}
          </div>
        ) : error ? (
          <div style={{ padding: 24, borderRadius: "var(--radius-lg)", background: "#fef2f2", border: "1px solid #fecaca" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}><XCircle size={16} color="#ef4444" /><span style={{ fontSize: 14, color: "#991b1b" }}>{error}</span></div>
          </div>
        ) : items.length === 0 ? (
          <EmptyState icon={<Map size={28} />} title="No Roadmap Yet" description="After approving your idea and market research in Notion, the Roadmap Agent will populate this view with a 3-phase product plan." />
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 32 }}>
            {phaseGroups.filter(g => g.items.length > 0).map(({ phase, items: phaseItems, bg, color, label }) => (
              <div key={phase}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
                  <div style={{ width: 8, height: 8, borderRadius: "50%", background: color }} />
                  <h2 style={{ fontWeight: 700, fontSize: 15, color: "var(--color-text-primary)" }}>{label}</h2>
                  <span style={{ fontSize: 12, color: "var(--color-text-muted)" }}>{phaseItems.length} item{phaseItems.length !== 1 ? "s" : ""}</span>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {phaseItems.map((r, i) => <RoadmapCard key={r.id} record={r} index={i} />)}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
