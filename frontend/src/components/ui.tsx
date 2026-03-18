"use client";

import { motion } from "framer-motion";
import { ReactNode } from "react";

interface StatCardProps {
  label: string;
  value: string | number;
  icon: ReactNode;
  trend?: string;
  color?: string;
  delay?: number;
}

export function StatCard({ label, value, icon, trend, color = "var(--color-brand)", delay = 0 }: StatCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay, ease: [0.4, 0, 0.2, 1] }}
      className="card"
      style={{ padding: "20px 24px", display: "flex", flexDirection: "column", gap: 12 }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div
          style={{
            width: 40,
            height: 40,
            borderRadius: "var(--radius-md)",
            background: `${color}14`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color,
          }}
        >
          {icon}
        </div>
        {trend && (
          <span
            style={{
              fontSize: 12,
              fontWeight: 500,
              color: "var(--color-success)",
              background: "#d1fae5",
              padding: "2px 8px",
              borderRadius: "var(--radius-full)",
            }}
          >
            {trend}
          </span>
        )}
      </div>
      <div>
        <p style={{ fontSize: 28, fontWeight: 700, color: "var(--color-text-primary)", lineHeight: 1 }}>
          {value}
        </p>
        <p style={{ fontSize: 13, color: "var(--color-text-muted)", marginTop: 4 }}>{label}</p>
      </div>
    </motion.div>
  );
}

// ---- Agent Step Card ---- //

interface AgentStep {
  agent: string;
  status: "idle" | "running" | "done" | "error";
  message: string;
  timestamp?: string;
}

interface AgentTimelineProps {
  steps: AgentStep[];
}

const STATUS_COLOR: Record<AgentStep["status"], string> = {
  idle: "var(--color-text-muted)",
  running: "var(--color-brand)",
  done: "var(--color-success)",
  error: "var(--color-error)",
};

const STATUS_BG: Record<AgentStep["status"], string> = {
  idle: "#f3f4f6",
  running: "var(--color-brand-light)",
  done: "#d1fae5",
  error: "#fee2e2",
};

export function AgentTimeline({ steps }: AgentTimelineProps) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
      {steps.map((step, i) => (
        <motion.div
          key={`${step.agent}-${i}`}
          initial={{ opacity: 0, x: -12 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.3, delay: i * 0.08 }}
          style={{ display: "flex", gap: 16, paddingBottom: i < steps.length - 1 ? 20 : 0, position: "relative" }}
        >
          {/* Timeline line */}
          {i < steps.length - 1 && (
            <div
              style={{
                position: "absolute",
                left: 15,
                top: 32,
                width: 2,
                height: "calc(100% - 12px)",
                background: "var(--color-border)",
              }}
            />
          )}

          {/* Dot */}
          <div
            style={{
              width: 32,
              height: 32,
              borderRadius: "50%",
              background: STATUS_BG[step.status],
              border: `2px solid ${STATUS_COLOR[step.status]}30`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
              zIndex: 1,
            }}
          >
            <div className={`status-dot ${step.status}`} />
          </div>

          {/* Content */}
          <div style={{ flex: 1, paddingTop: 4 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 2 }}>
              <span style={{ fontWeight: 600, fontSize: 14, color: "var(--color-text-primary)" }}>
                {step.agent}
              </span>
              {step.timestamp && (
                <span style={{ fontSize: 11, color: "var(--color-text-muted)" }}>{step.timestamp}</span>
              )}
            </div>
            <p style={{ fontSize: 13, color: "var(--color-text-secondary)", lineHeight: 1.5 }}>
              {step.message}
            </p>
            <span
              style={{
                display: "inline-block",
                marginTop: 4,
                fontSize: 11,
                fontWeight: 500,
                color: STATUS_COLOR[step.status],
                background: STATUS_BG[step.status],
                padding: "2px 8px",
                borderRadius: "var(--radius-full)",
                textTransform: "capitalize",
              }}
            >
              {step.status}
            </span>
          </div>
        </motion.div>
      ))}
    </div>
  );
}

// ---- Empty State ---- //

interface EmptyStateProps {
  icon: ReactNode;
  title: string;
  description: string;
  action?: ReactNode;
}

export function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "64px 24px",
        textAlign: "center",
        gap: 16,
      }}
    >
      <div
        style={{
          width: 64,
          height: 64,
          borderRadius: "var(--radius-xl)",
          background: "var(--color-surface)",
          border: "1px solid var(--color-border)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "var(--color-text-muted)",
        }}
      >
        {icon}
      </div>
      <div>
        <p style={{ fontWeight: 600, fontSize: 16, color: "var(--color-text-primary)", marginBottom: 4 }}>
          {title}
        </p>
        <p style={{ fontSize: 14, color: "var(--color-text-muted)", maxWidth: 320, lineHeight: 1.6 }}>
          {description}
        </p>
      </div>
      {action && <div>{action}</div>}
    </motion.div>
  );
}

// ---- Loading Skeleton ---- //
export function Skeleton({ width = "100%", height = 20, rounded = false }: {
  width?: string | number;
  height?: number;
  rounded?: boolean;
}) {
  return (
    <div
      className="shimmer"
      style={{
        width,
        height,
        borderRadius: rounded ? "var(--radius-full)" : "var(--radius-sm)",
      }}
    />
  );
}
