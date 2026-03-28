"use client";

import { motion, useScroll, useTransform } from "framer-motion";
import Link from "next/link";
import { useRef } from "react";
import {
  Zap, Lightbulb, TrendingUp, Map, CheckSquare,
  ArrowRight, Github, ExternalLink, Bot, Brain,
  Database, Layers, Cpu, Star, GitFork,
  Play, Shield, Globe, Terminal,
} from "lucide-react";

// ─── Data ─────────────────────────────────────────────────────────────────────

const FEATURES = [
  {
    icon: Lightbulb,
    color: "#7C3AED",
    bg: "#7C3AED14",
    title: "Idea Analysis Agent",
    desc: "Submit any startup idea and an LLM agent scores it on market size, feasibility, competition, and moat — with a structured Notion record created instantly.",
  },
  {
    icon: TrendingUp,
    color: "#06B6D4",
    bg: "#06B6D414",
    title: "Market Research Agent",
    desc: "DuckDuckGo OSINT + BeautifulSoup scraping runs autonomously. Competitor intelligence, TAM estimates, and trend signals land in your Notion workspace.",
  },
  {
    icon: Map,
    color: "#10B981",
    bg: "#10B98114",
    title: "Roadmap Generator",
    desc: "Three-phase product roadmaps with milestones, deliverables, and timeline estimates — written directly to a structured Notion database by the AI.",
  },
  {
    icon: CheckSquare,
    color: "#F59E0B",
    bg: "#F59E0B14",
    title: "Task Planner Agent",
    desc: "Breaks down the roadmap into sprint-ready Kanban tasks with priorities, owners, and due dates. Your Notion task board is populated automatically.",
  },
  {
    icon: Brain,
    color: "#EC4899",
    bg: "#EC489914",
    title: "FAISS Vector Memory",
    desc: "Every analysis is indexed in a local FAISS store. Agents recall past research, avoid redundant work, and surface relevant context across runs.",
  },
  {
    icon: Bot,
    color: "#8B5CF6",
    bg: "#8B5CF614",
    title: "Human-in-the-Loop",
    desc: "LangGraph checkpoints pause the pipeline at critical junctions — idea scoring and market research — so you stay in control of every strategic decision.",
  },
];

const STACK = [
  { icon: Cpu, label: "Groq LLaMA 3.3 70B", color: "#7C3AED" },
  { icon: Layers, label: "LangGraph Multi-Agent", color: "#06B6D4" },
  { icon: Database, label: "Notion as Data Store", color: "#10B981" },
  { icon: Terminal, label: "FastAPI + Python 3.11", color: "#F59E0B" },
  { icon: Globe, label: "Next.js 14 App Router", color: "#EC4899" },
  { icon: Shield, label: "Clerk Auth (JWT)", color: "#8B5CF6" },
];

const PIPELINE_STEPS = [
  { step: "01", label: "Submit Idea", detail: "Natural language input → Notion record created" },
  { step: "02", label: "AI Scoring", detail: "LLaMA 3.3 70B scores on 5 dimensions" },
  { step: "03", label: "✓ Checkpoint", detail: "Human approves before next phase" },
  { step: "04", label: "Market Research", detail: "DuckDuckGo OSINT + web scraping" },
  { step: "05", label: "✓ Checkpoint", detail: "Review research before roadmapping" },
  { step: "06", label: "Roadmap + Tasks", detail: "Notion databases auto-populated" },
];

// ─── Nav ──────────────────────────────────────────────────────────────────────

function Navbar() {
  return (
    <motion.nav
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        zIndex: 100,
        padding: "0 48px",
        height: 64,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        background: "rgba(255,255,255,0.85)",
        backdropFilter: "blur(16px)",
        WebkitBackdropFilter: "blur(16px)",
        borderBottom: "1px solid rgba(0,0,0,0.06)",
      }}
    >
      {/* Logo */}
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <div
          style={{
            width: 32,
            height: 32,
            borderRadius: 9,
            background: "linear-gradient(135deg, #7C3AED 0%, #06B6D4 100%)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Zap size={16} color="#fff" fill="#fff" />
        </div>
        <span style={{ fontWeight: 800, fontSize: 17, color: "#111827", letterSpacing: "-0.4px" }}>
          VentureNode
        </span>
      </div>

      {/* Links */}
      <div style={{ display: "flex", alignItems: "center", gap: 32 }}>
        {["Features", "Pipeline", "Stack"].map((item) => (
          <a
            key={item}
            href={`#${item.toLowerCase()}`}
            style={{
              fontSize: 14,
              fontWeight: 500,
              color: "#6B7280",
              textDecoration: "none",
              transition: "color 180ms",
            }}
            onMouseEnter={(e) => ((e.target as HTMLElement).style.color = "#111827")}
            onMouseLeave={(e) => ((e.target as HTMLElement).style.color = "#6B7280")}
          >
            {item}
          </a>
        ))}
      </div>

      {/* CTAs */}
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <a
          href="https://github.com/Prakhar2025/VentureNode"
          target="_blank"
          rel="noopener noreferrer"
          style={{
            display: "flex",
            alignItems: "center",
            gap: 7,
            fontSize: 14,
            fontWeight: 600,
            color: "#374151",
            textDecoration: "none",
            padding: "7px 14px",
            borderRadius: 8,
            border: "1px solid rgba(0,0,0,0.08)",
            background: "rgba(255,255,255,0.8)",
            transition: "all 180ms",
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLElement).style.borderColor = "rgba(124,58,237,0.3)";
            (e.currentTarget as HTMLElement).style.color = "#7C3AED";
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLElement).style.borderColor = "rgba(0,0,0,0.08)";
            (e.currentTarget as HTMLElement).style.color = "#374151";
          }}
        >
          <Github size={15} />
          <span>GitHub</span>
        </a>

        <Link
          href="/dashboard"
          style={{
            display: "flex",
            alignItems: "center",
            gap: 7,
            fontSize: 14,
            fontWeight: 700,
            color: "#fff",
            textDecoration: "none",
            padding: "8px 18px",
            borderRadius: 9,
            background: "linear-gradient(135deg, #7C3AED 0%, #6D28D9 100%)",
            boxShadow: "0 2px 12px rgba(124,58,237,0.35)",
            transition: "transform 150ms, box-shadow 150ms",
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLElement).style.transform = "translateY(-1px)";
            (e.currentTarget as HTMLElement).style.boxShadow = "0 4px 18px rgba(124,58,237,0.45)";
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLElement).style.transform = "translateY(0)";
            (e.currentTarget as HTMLElement).style.boxShadow = "0 2px 12px rgba(124,58,237,0.35)";
          }}
        >
          <span>Launch App</span>
          <ArrowRight size={14} />
        </Link>
      </div>
    </motion.nav>
  );
}

// ─── Hero ─────────────────────────────────────────────────────────────────────

function Hero() {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: ref });
  const y = useTransform(scrollYProgress, [0, 1], [0, -60]);

  return (
    <section
      ref={ref}
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        textAlign: "center",
        padding: "120px 48px 80px",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Background orbs */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          overflow: "hidden",
          pointerEvents: "none",
        }}
      >
        <div
          style={{
            position: "absolute",
            top: "10%",
            left: "15%",
            width: 600,
            height: 600,
            borderRadius: "50%",
            background: "radial-gradient(circle, rgba(124,58,237,0.12) 0%, transparent 70%)",
            filter: "blur(40px)",
          }}
        />
        <div
          style={{
            position: "absolute",
            top: "20%",
            right: "10%",
            width: 500,
            height: 500,
            borderRadius: "50%",
            background: "radial-gradient(circle, rgba(6,182,212,0.1) 0%, transparent 70%)",
            filter: "blur(40px)",
          }}
        />
        <div
          style={{
            position: "absolute",
            bottom: "15%",
            left: "30%",
            width: 700,
            height: 400,
            borderRadius: "50%",
            background: "radial-gradient(circle, rgba(16,185,129,0.07) 0%, transparent 70%)",
            filter: "blur(50px)",
          }}
        />
      </div>

      <motion.div style={{ y, position: "relative", zIndex: 1, maxWidth: 860 }}>
        {/* Badge */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            padding: "6px 16px",
            borderRadius: 999,
            background: "linear-gradient(135deg, rgba(124,58,237,0.08), rgba(6,182,212,0.08))",
            border: "1px solid rgba(124,58,237,0.18)",
            marginBottom: 32,
          }}
        >
          <motion.span
            animate={{ opacity: [1, 0.5, 1] }}
            transition={{ duration: 2, repeat: Infinity }}
            style={{
              width: 6,
              height: 6,
              borderRadius: "50%",
              background: "#10B981",
              display: "inline-block",
            }}
          />
          <span style={{ fontSize: 12.5, fontWeight: 700, color: "#7C3AED", letterSpacing: "0.04em" }}>
            OPEN SOURCE · NOTION MCP HACKATHON
          </span>
        </motion.div>

        {/* Headline */}
        <motion.h1
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          style={{
            fontSize: "clamp(44px, 7vw, 80px)",
            fontWeight: 900,
            letterSpacing: "-2.5px",
            lineHeight: 1.05,
            color: "#111827",
            marginBottom: 28,
          }}
        >
          Your AI{" "}
          <span
            style={{
              background: "linear-gradient(135deg, #7C3AED 0%, #06B6D4 100%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
            }}
          >
            Co-Founder
          </span>
          <br />
          lives in Notion.
        </motion.h1>

        {/* Subheadline */}
        <motion.p
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          style={{
            fontSize: "clamp(16px, 2vw, 20px)",
            color: "#6B7280",
            lineHeight: 1.65,
            maxWidth: 640,
            margin: "0 auto 48px",
          }}
        >
          VentureNode is an autonomous multi-agent AI system that turns your startup idea into
          a market-researched roadmap with execution tasks — all structured inside your Notion workspace
          using LLaMA 3.3 70B and LangGraph.
        </motion.p>

        {/* CTAs */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.5 }}
          style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 16, flexWrap: "wrap" }}
        >
          <Link
            href="/dashboard"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 9,
              padding: "14px 28px",
              borderRadius: 12,
              background: "linear-gradient(135deg, #7C3AED 0%, #6D28D9 100%)",
              color: "#fff",
              fontWeight: 700,
              fontSize: 16,
              textDecoration: "none",
              boxShadow: "0 4px 20px rgba(124,58,237,0.4), 0 0 0 1px rgba(124,58,237,0.2)",
              transition: "transform 150ms, box-shadow 150ms",
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLElement).style.transform = "translateY(-2px)";
              (e.currentTarget as HTMLElement).style.boxShadow = "0 8px 28px rgba(124,58,237,0.5), 0 0 0 1px rgba(124,58,237,0.2)";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLElement).style.transform = "translateY(0)";
              (e.currentTarget as HTMLElement).style.boxShadow = "0 4px 20px rgba(124,58,237,0.4), 0 0 0 1px rgba(124,58,237,0.2)";
            }}
          >
            <Play size={16} fill="#fff" />
            Launch Dashboard
            <ArrowRight size={15} />
          </Link>

          <a
            href="https://github.com/Prakhar2025/VentureNode"
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 9,
              padding: "14px 24px",
              borderRadius: 12,
              background: "rgba(255,255,255,0.9)",
              color: "#374151",
              fontWeight: 700,
              fontSize: 16,
              textDecoration: "none",
              border: "1px solid rgba(0,0,0,0.1)",
              boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
              transition: "all 150ms",
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLElement).style.borderColor = "rgba(124,58,237,0.25)";
              (e.currentTarget as HTMLElement).style.color = "#7C3AED";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLElement).style.borderColor = "rgba(0,0,0,0.1)";
              (e.currentTarget as HTMLElement).style.color = "#374151";
            }}
          >
            <Github size={16} />
            Star on GitHub
            <Star size={13} />
          </a>
        </motion.div>

        {/* Social proof strip */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.55 }}
          style={{
            marginTop: 56,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 32,
            flexWrap: "wrap",
          }}
        >
          {[
            { label: "Notion MCP Hackathon Entry", icon: Zap },
            { label: "100% Free Stack", icon: Shield },
            { label: "Open Source", icon: GitFork },
          ].map(({ label, icon: Icon }) => (
            <div
              key={label}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 7,
                fontSize: 13,
                fontWeight: 500,
                color: "#9CA3AF",
              }}
            >
              <Icon size={14} color="#7C3AED" />
              {label}
            </div>
          ))}
        </motion.div>
      </motion.div>
    </section>
  );
}

// ─── Features ─────────────────────────────────────────────────────────────────

function Features() {
  return (
    <section
      id="features"
      style={{
        padding: "100px 48px",
        maxWidth: 1200,
        margin: "0 auto",
      }}
    >
      {/* Section label */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5 }}
        style={{ textAlign: "center", marginBottom: 64 }}
      >
        <div
          style={{
            display: "inline-block",
            fontSize: 12,
            fontWeight: 700,
            color: "#7C3AED",
            letterSpacing: "0.1em",
            textTransform: "uppercase",
            marginBottom: 16,
            padding: "4px 14px",
            borderRadius: 999,
            background: "rgba(124,58,237,0.07)",
            border: "1px solid rgba(124,58,237,0.15)",
          }}
        >
          Capabilities
        </div>
        <h2
          style={{
            fontSize: "clamp(28px, 4vw, 48px)",
            fontWeight: 900,
            letterSpacing: "-1.2px",
            color: "#111827",
            marginBottom: 16,
          }}
        >
          Six agents.{" "}
          <span
            style={{
              background: "linear-gradient(135deg, #7C3AED, #06B6D4)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
            }}
          >
            Zero manual work.
          </span>
        </h2>
        <p style={{ fontSize: 17, color: "#6B7280", maxWidth: 520, margin: "0 auto" }}>
          Each agent is a specialized LLM node in a LangGraph state machine,
          with human approval checkpoints at critical decision points.
        </p>
      </motion.div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(340px, 1fr))",
          gap: 20,
        }}
      >
        {FEATURES.map((f, i) => (
          <motion.div
            key={f.title}
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: i * 0.08, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
            whileHover={{ y: -5, transition: { duration: 0.2 } }}
            style={{
              background: "rgba(255,255,255,0.85)",
              backdropFilter: "blur(12px)",
              WebkitBackdropFilter: "blur(12px)",
              border: "1px solid rgba(0,0,0,0.06)",
              borderRadius: 20,
              padding: "32px 28px",
              boxShadow: "0 2px 12px rgba(0,0,0,0.04), 0 0 0 1px rgba(0,0,0,0.03)",
              cursor: "default",
            }}
          >
            <div
              style={{
                width: 48,
                height: 48,
                borderRadius: 14,
                background: f.bg,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: f.color,
                marginBottom: 20,
              }}
            >
              <f.icon size={22} />
            </div>
            <h3
              style={{
                fontWeight: 700,
                fontSize: 17,
                color: "#111827",
                letterSpacing: "-0.3px",
                marginBottom: 10,
              }}
            >
              {f.title}
            </h3>
            <p style={{ fontSize: 14.5, color: "#6B7280", lineHeight: 1.6 }}>{f.desc}</p>
          </motion.div>
        ))}
      </div>
    </section>
  );
}

// ─── Pipeline ─────────────────────────────────────────────────────────────────

function Pipeline() {
  return (
    <section
      id="pipeline"
      style={{
        padding: "100px 48px",
        background: "linear-gradient(180deg, transparent 0%, rgba(124,58,237,0.03) 50%, transparent 100%)",
      }}
    >
      <div style={{ maxWidth: 900, margin: "0 auto" }}>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          style={{ textAlign: "center", marginBottom: 64 }}
        >
          <div
            style={{
              display: "inline-block",
              fontSize: 12,
              fontWeight: 700,
              color: "#06B6D4",
              letterSpacing: "0.1em",
              textTransform: "uppercase",
              marginBottom: 16,
              padding: "4px 14px",
              borderRadius: 999,
              background: "rgba(6,182,212,0.07)",
              border: "1px solid rgba(6,182,212,0.15)",
            }}
          >
            How it works
          </div>
          <h2
            style={{
              fontSize: "clamp(28px, 4vw, 48px)",
              fontWeight: 900,
              letterSpacing: "-1.2px",
              color: "#111827",
              marginBottom: 16,
            }}
          >
            From idea to execution
            <br />
            <span
              style={{
                background: "linear-gradient(135deg, #06B6D4, #10B981)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text",
              }}
            >
              in one pipeline.
            </span>
          </h2>
        </motion.div>

        <div style={{ position: "relative" }}>
          {/* Vertical line */}
          <div
            style={{
              position: "absolute",
              left: 36,
              top: 28,
              bottom: 28,
              width: 2,
              background: "linear-gradient(180deg, #7C3AED 0%, #06B6D4 50%, #10B981 100%)",
              opacity: 0.15,
            }}
          />

          {PIPELINE_STEPS.map((s, i) => (
            <motion.div
              key={s.step}
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
              style={{
                display: "flex",
                alignItems: "flex-start",
                gap: 24,
                marginBottom: i === PIPELINE_STEPS.length - 1 ? 0 : 28,
                position: "relative",
              }}
            >
              {/* Step number circle */}
              <div
                style={{
                  width: 56,
                  height: 56,
                  borderRadius: "50%",
                  background: s.label.includes("✓")
                    ? "linear-gradient(135deg, #10B981, #059669)"
                    : "linear-gradient(135deg, #7C3AED, #6D28D9)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                  boxShadow: s.label.includes("✓")
                    ? "0 4px 14px rgba(16,185,129,0.3)"
                    : "0 4px 14px rgba(124,58,237,0.3)",
                }}
              >
                <span style={{ fontSize: 13, fontWeight: 800, color: "#fff" }}>{s.step}</span>
              </div>

              {/* Content */}
              <div
                style={{
                  flex: 1,
                  background: "rgba(255,255,255,0.85)",
                  backdropFilter: "blur(12px)",
                  WebkitBackdropFilter: "blur(12px)",
                  border: "1px solid rgba(0,0,0,0.06)",
                  borderRadius: 16,
                  padding: "18px 24px",
                  boxShadow: "0 2px 10px rgba(0,0,0,0.04)",
                }}
              >
                <p
                  style={{
                    fontWeight: 700,
                    fontSize: 15.5,
                    color: s.label.includes("✓") ? "#065F46" : "#111827",
                    marginBottom: 4,
                    letterSpacing: "-0.2px",
                  }}
                >
                  {s.label}
                </p>
                <p style={{ fontSize: 13.5, color: "#9CA3AF" }}>{s.detail}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── Stack ────────────────────────────────────────────────────────────────────

function TechStack() {
  return (
    <section
      id="stack"
      style={{ padding: "100px 48px", maxWidth: 1100, margin: "0 auto" }}
    >
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        style={{ textAlign: "center", marginBottom: 64 }}
      >
        <div
          style={{
            display: "inline-block",
            fontSize: 12,
            fontWeight: 700,
            color: "#10B981",
            letterSpacing: "0.1em",
            textTransform: "uppercase",
            marginBottom: 16,
            padding: "4px 14px",
            borderRadius: 999,
            background: "rgba(16,185,129,0.07)",
            border: "1px solid rgba(16,185,129,0.15)",
          }}
        >
          Tech Stack
        </div>
        <h2
          style={{
            fontSize: "clamp(28px, 4vw, 48px)",
            fontWeight: 900,
            letterSpacing: "-1.2px",
            color: "#111827",
            marginBottom: 16,
          }}
        >
          Entirely{" "}
          <span
            style={{
              background: "linear-gradient(135deg, #10B981, #06B6D4)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
            }}
          >
            free-tier.
          </span>{" "}
          Production-grade.
        </h2>
        <p style={{ fontSize: 17, color: "#6B7280", maxWidth: 480, margin: "0 auto" }}>
          No paid APIs. No proprietary lock-in. Built with the best open
          ecosystem tools available.
        </p>
      </motion.div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
          gap: 16,
        }}
      >
        {STACK.map((s, i) => (
          <motion.div
            key={s.label}
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ delay: i * 0.07 }}
            whileHover={{ scale: 1.03, transition: { duration: 0.18 } }}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 16,
              padding: "20px 22px",
              background: "rgba(255,255,255,0.9)",
              backdropFilter: "blur(12px)",
              WebkitBackdropFilter: "blur(12px)",
              border: "1px solid rgba(0,0,0,0.06)",
              borderRadius: 16,
              boxShadow: "0 2px 10px rgba(0,0,0,0.04)",
              cursor: "default",
            }}
          >
            <div
              style={{
                width: 42,
                height: 42,
                borderRadius: 12,
                background: `${s.color}14`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: s.color,
                flexShrink: 0,
              }}
            >
              <s.icon size={20} />
            </div>
            <span style={{ fontWeight: 600, fontSize: 15, color: "#111827" }}>{s.label}</span>
          </motion.div>
        ))}
      </div>
    </section>
  );
}

// ─── CTA Banner ───────────────────────────────────────────────────────────────

function CTABanner() {
  return (
    <section style={{ padding: "80px 48px 120px" }}>
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        style={{
          maxWidth: 860,
          margin: "0 auto",
          background: "linear-gradient(135deg, #7C3AED 0%, #4F46E5 50%, #06B6D4 100%)",
          borderRadius: 28,
          padding: "64px 48px",
          textAlign: "center",
          position: "relative",
          overflow: "hidden",
          boxShadow: "0 20px 60px rgba(124,58,237,0.35)",
        }}
      >
        {/* Shine overlay */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            background: "radial-gradient(ellipse at 30% 20%, rgba(255,255,255,0.12) 0%, transparent 60%)",
            pointerEvents: "none",
          }}
        />

        <h2
          style={{
            fontSize: "clamp(28px, 4vw, 44px)",
            fontWeight: 900,
            letterSpacing: "-1.2px",
            color: "#fff",
            marginBottom: 16,
            position: "relative",
          }}
        >
          Ready to build with AI agents?
        </h2>
        <p
          style={{
            fontSize: 18,
            color: "rgba(255,255,255,0.8)",
            maxWidth: 480,
            margin: "0 auto 40px",
            lineHeight: 1.6,
            position: "relative",
          }}
        >
          Start your first pipeline — it&apos;s free, open-source, and your data lives in Notion.
        </p>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 16,
            flexWrap: "wrap",
            position: "relative",
          }}
        >
          <Link
            href="/dashboard"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 9,
              padding: "15px 30px",
              borderRadius: 12,
              background: "#fff",
              color: "#7C3AED",
              fontWeight: 800,
              fontSize: 16,
              textDecoration: "none",
              boxShadow: "0 4px 20px rgba(0,0,0,0.15)",
              transition: "transform 150ms",
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLElement).style.transform = "translateY(-2px)";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLElement).style.transform = "translateY(0)";
            }}
          >
            <Play size={16} fill="#7C3AED" />
            Launch Dashboard
          </Link>

          <a
            href="https://github.com/Prakhar2025/VentureNode"
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 9,
              padding: "15px 24px",
              borderRadius: 12,
              background: "rgba(255,255,255,0.15)",
              color: "#fff",
              fontWeight: 700,
              fontSize: 16,
              textDecoration: "none",
              border: "1px solid rgba(255,255,255,0.25)",
              backdropFilter: "blur(8px)",
              transition: "background 150ms",
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.22)";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.15)";
            }}
          >
            <Github size={16} />
            View Source
            <ExternalLink size={13} />
          </a>
        </div>
      </motion.div>
    </section>
  );
}

// ─── Footer ───────────────────────────────────────────────────────────────────

function Footer() {
  return (
    <footer
      style={{
        borderTop: "1px solid rgba(0,0,0,0.06)",
        padding: "32px 48px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        flexWrap: "wrap",
        gap: 16,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <div
          style={{
            width: 26,
            height: 26,
            borderRadius: 7,
            background: "linear-gradient(135deg, #7C3AED 0%, #06B6D4 100%)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Zap size={13} color="#fff" fill="#fff" />
        </div>
        <span style={{ fontWeight: 800, fontSize: 14, color: "#374151" }}>VentureNode</span>
        <span style={{ fontSize: 13, color: "#9CA3AF" }}>— Autonomous AI Startup OS</span>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 24 }}>
        <a
          href="https://github.com/Prakhar2025/VentureNode"
          target="_blank"
          rel="noopener noreferrer"
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            fontSize: 13,
            fontWeight: 500,
            color: "#6B7280",
            textDecoration: "none",
            transition: "color 150ms",
          }}
          onMouseEnter={(e) => ((e.target as HTMLElement).style.color = "#111827")}
          onMouseLeave={(e) => ((e.target as HTMLElement).style.color = "#6B7280")}
        >
          <Github size={14} />
          GitHub
        </a>
        <span style={{ fontSize: 13, color: "#9CA3AF" }}>Built by Prakhar Shukla · 2026</span>
      </div>
    </footer>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function LandingPage() {
  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#F8F9FC",
        fontFamily:
          "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
      }}
    >
      <Navbar />
      <Hero />
      <Features />
      <Pipeline />
      <TechStack />
      <CTABanner />
      <Footer />
    </div>
  );
}
