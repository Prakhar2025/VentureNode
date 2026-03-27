"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@clerk/nextjs";
import { motion } from "framer-motion";
import { TrendingUp, RefreshCw, ExternalLink, XCircle } from "lucide-react";
import Sidebar from "@/components/Sidebar";
import { EmptyState, Skeleton } from "@/components/ui";
import { getResearch, extractText, extractSelect, type NotionRecord } from "@/lib/api";

const CONFIDENCE_COLOR: Record<string, string> = {
  High: "#10b981", Medium: "#f59e0b", Low: "#ef4444",
};

function ResearchCard({ record, index }: { record: NotionRecord; index: number }) {
  const props = record.properties;
  const topic = extractText(props["Topic"]);
  const summary = extractText(props["Summary"]);
  const confidence = extractSelect(props["Confidence Level"], "Medium");
  const sources = (props["Sources"] as { multi_select?: Array<{ name: string }> })?.multi_select ?? [];

  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: index * 0.05 }}
      className="card"
      style={{ padding: 24 }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{
            width: 36, height: 36, borderRadius: "var(--radius-md)",
            background: "var(--color-accent-light)", display: "flex",
            alignItems: "center", justifyContent: "center",
          }}>
            <TrendingUp size={16} color="var(--color-accent)" />
          </div>
          <h3 style={{ fontWeight: 700, fontSize: 15, color: "var(--color-text-primary)" }}>{topic}</h3>
        </div>
        <span style={{
          fontSize: 11, fontWeight: 700, padding: "3px 10px",
          borderRadius: "var(--radius-full)",
          background: `${CONFIDENCE_COLOR[confidence] ?? "#6b7280"}15`,
          color: CONFIDENCE_COLOR[confidence] ?? "#6b7280",
        }}>
          {confidence} Confidence
        </span>
      </div>

      {summary && (
        <p style={{ fontSize: 13, color: "var(--color-text-secondary)", lineHeight: 1.6, marginBottom: 14 }}>
          {summary.slice(0, 300)}{summary.length > 300 ? "..." : ""}
        </p>
      )}

      {sources.length > 0 && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 12 }}>
          {sources.slice(0, 5).map((s, i) => (
            <a key={i} href={s.name} target="_blank" rel="noopener noreferrer"
              style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 11, color: "var(--color-brand)",
                padding: "3px 8px", borderRadius: "var(--radius-full)", border: "1px solid var(--color-brand-border)",
                background: "var(--color-brand-light)", textDecoration: "none", fontWeight: 500,
              }}>
              <ExternalLink size={10} />
              Source {i + 1}
            </a>
          ))}
        </div>
      )}

      <a href={record.url} target="_blank" rel="noopener noreferrer"
        style={{ fontSize: 12, color: "var(--color-brand)", fontWeight: 500, textDecoration: "none" }}>
        Open in Notion →
      </a>
    </motion.div>
  );
}

export default function ResearchPage() {
  const { getToken } = useAuth();
  const [research, setResearch] = useState<NotionRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setLoading(true); setError(null);
    try {
      const token = (await getToken()) ?? "";
      const d = await getResearch(token);
      setResearch(d.results);
    }
    catch (e) { setError(e instanceof Error ? e.message : "Failed to load"); }
    finally { setLoading(false); }
  }

  useEffect(() => { load(); }, []);

  return (
    <div style={{ display: "flex", minHeight: "100vh" }}>
      <Sidebar />
      <main style={{ marginLeft: 240, flex: 1, padding: "40px 48px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 32 }}>
          <div>
            <h1 style={{ fontSize: 26, fontWeight: 800, letterSpacing: "-0.4px", marginBottom: 4 }}>Research</h1>
            <p style={{ fontSize: 14, color: "var(--color-text-secondary)" }}>
              {loading ? "Loading..." : `${research.length} research record${research.length !== 1 ? "s" : ""} from live OSINT`}
            </p>
          </div>
          <button onClick={load} style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 16px", borderRadius: "var(--radius-md)", border: "1px solid var(--color-border)", background: "white", fontSize: 13, cursor: "pointer" }}>
            <RefreshCw size={14} />Refresh
          </button>
        </div>

        {loading ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {[1,2,3].map(i => <div key={i} className="card" style={{ padding: 24, display: "flex", flexDirection: "column", gap: 12 }}><Skeleton width="60%" height={18} /><Skeleton height={13} /><Skeleton width="70%" height={13} /></div>)}
          </div>
        ) : error ? (
          <div style={{ padding: 24, borderRadius: "var(--radius-lg)", background: "#fef2f2", border: "1px solid #fecaca" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}><XCircle size={16} color="#ef4444" /><span style={{ fontSize: 14, color: "#991b1b" }}>{error}</span></div>
          </div>
        ) : research.length === 0 ? (
          <EmptyState icon={<TrendingUp size={28} />} title="No Research Yet" description="After you submit an idea and the Market Research Agent runs, competitive intelligence and market data will appear here." />
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {research.map((r, i) => <ResearchCard key={r.id} record={r} index={i} />)}
          </div>
        )}
      </main>
    </div>
  );
}
