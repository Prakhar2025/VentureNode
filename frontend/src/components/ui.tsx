"use client";

import { motion } from "framer-motion";
import { ReactNode } from "react";
import { TrendingUp, TrendingDown } from "lucide-react";

// ------------------------------------------------------------------ //
// StatCard                                                             //
// ------------------------------------------------------------------ //

interface StatCardProps {
  label: string;
  value: string | number;
  icon: ReactNode;
  trend?: string;
  trendUp?: boolean;
  color?: string;
  delay?: number;
  sublabel?: string;
}

export function StatCard({
  label,
  value,
  icon,
  trend,
  trendUp = true,
  color = "#7C3AED",
  delay = 0,
  sublabel,
}: StatCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, delay, ease: [0.22, 1, 0.36, 1] }}
      whileHover={{ y: -3, scale: 1.01 }}
      style={{
        background: "rgba(255,255,255,0.88)",
        backdropFilter: "blur(12px)",
        WebkitBackdropFilter: "blur(12px)",
        border: "1px solid rgba(0,0,0,0.06)",
        borderRadius: 20,
        padding: "24px 24px",
        boxShadow: "0 0 0 1px rgba(0,0,0,0.04), 0 4px 16px rgba(0,0,0,0.05)",
        transition: "box-shadow 220ms ease",
        cursor: "default",
        display: "flex",
        flexDirection: "column",
        gap: 16,
      }}
    >
      {/* Icon + trend row */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div
          style={{
            width: 44,
            height: 44,
            borderRadius: 14,
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
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 4,
              fontSize: 12,
              fontWeight: 600,
              color: trendUp ? "#10B981" : "#EF4444",
              background: trendUp ? "#D1FAE5" : "#FEE2E2",
              padding: "3px 8px",
              borderRadius: 999,
            }}
          >
            {trendUp ? <TrendingUp size={11} /> : <TrendingDown size={11} />}
            {trend}
          </div>
        )}
      </div>

      {/* Value + label */}
      <div>
        <p
          style={{
            fontSize: 30,
            fontWeight: 800,
            color: "#111827",
            lineHeight: 1,
            letterSpacing: "-0.5px",
            marginBottom: 4,
          }}
        >
          {value}
        </p>
        <p style={{ fontSize: 13, color: "#6B7280", fontWeight: 500 }}>{label}</p>
        {sublabel && (
          <p style={{ fontSize: 11, color: "#9CA3AF", marginTop: 2 }}>{sublabel}</p>
        )}
      </div>
    </motion.div>
  );
}

// ------------------------------------------------------------------ //
// AgentTimeline                                                        //
// ------------------------------------------------------------------ //

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
  idle: "#9CA3AF",
  running: "#7C3AED",
  done: "#10B981",
  error: "#EF4444",
};

const STATUS_BG: Record<AgentStep["status"], string> = {
  idle: "#F3F4F6",
  running: "#EDE9FE",
  done: "#D1FAE5",
  error: "#FEE2E2",
};

const STATUS_LABEL: Record<AgentStep["status"], string> = {
  idle: "Waiting",
  running: "Running",
  done: "Complete",
  error: "Failed",
};

export function AgentTimeline({ steps }: AgentTimelineProps) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
      {steps.map((step, i) => (
        <motion.div
          key={`${step.agent}-${i}`}
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.3, delay: i * 0.07 }}
          style={{
            display: "flex",
            gap: 14,
            paddingBottom: i < steps.length - 1 ? 20 : 0,
            position: "relative",
          }}
        >
          {/* Timeline connector line */}
          {i < steps.length - 1 && (
            <div
              style={{
                position: "absolute",
                left: 15,
                top: 34,
                width: 2,
                height: "calc(100% - 14px)",
                background: `linear-gradient(180deg, ${STATUS_COLOR[step.status]}40 0%, rgba(0,0,0,0.06) 100%)`,
                borderRadius: 2,
              }}
            />
          )}

          {/* Status circle */}
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
              boxShadow: step.status === "running"
                ? `0 0 0 4px rgba(124,58,237,0.15)`
                : "none",
              transition: "all 300ms",
            }}
          >
            <div className={`status-dot ${step.status}`} />
          </div>

          {/* Content */}
          <div style={{ flex: 1, paddingTop: 4, minWidth: 0 }}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: 2,
                gap: 8,
              }}
            >
              <span style={{ fontWeight: 600, fontSize: 13.5, color: "#111827" }}>
                {step.agent}
              </span>
              <span
                style={{
                  fontSize: 10.5,
                  fontWeight: 600,
                  color: STATUS_COLOR[step.status],
                  background: STATUS_BG[step.status],
                  padding: "2px 8px",
                  borderRadius: 999,
                  flexShrink: 0,
                  textTransform: "uppercase",
                  letterSpacing: "0.04em",
                }}
              >
                {STATUS_LABEL[step.status]}
              </span>
            </div>
            <p
              style={{
                fontSize: 12.5,
                color: "#6B7280",
                lineHeight: 1.5,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {step.message}
            </p>
          </div>
        </motion.div>
      ))}
    </div>
  );
}

// ------------------------------------------------------------------ //
// EmptyState                                                           //
// ------------------------------------------------------------------ //

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
          borderRadius: 20,
          background: "rgba(124,58,237,0.07)",
          border: "1px solid rgba(124,58,237,0.12)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "#7C3AED",
        }}
      >
        {icon}
      </div>
      <div>
        <p style={{ fontWeight: 700, fontSize: 16, color: "#111827", marginBottom: 6 }}>
          {title}
        </p>
        <p style={{ fontSize: 14, color: "#9CA3AF", maxWidth: 320, lineHeight: 1.6 }}>
          {description}
        </p>
      </div>
      {action && <div>{action}</div>}
    </motion.div>
  );
}

// ------------------------------------------------------------------ //
// Skeleton                                                             //
// ------------------------------------------------------------------ //

export function Skeleton({
  width = "100%",
  height = 20,
  rounded = false,
}: {
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
        borderRadius: rounded ? 999 : 8,
      }}
    />
  );
}

// ------------------------------------------------------------------ //
// GlassCard — floating card wrapper                                    //
// ------------------------------------------------------------------ //

export function GlassCard({
  children,
  padding = 28,
  style,
}: {
  children: ReactNode;
  padding?: number;
  style?: React.CSSProperties;
}) {
  return (
    <motion.div
      whileHover={{ y: -2 }}
      transition={{ duration: 0.2 }}
      style={{
        background: "rgba(255,255,255,0.88)",
        backdropFilter: "blur(16px)",
        WebkitBackdropFilter: "blur(16px)",
        border: "1px solid rgba(0,0,0,0.06)",
        borderRadius: 20,
        boxShadow: "0 0 0 1px rgba(0,0,0,0.04), 0 4px 20px rgba(0,0,0,0.05)",
        padding,
        ...style,
      }}
    >
      {children}
    </motion.div>
  );
}

// ------------------------------------------------------------------ //
// SectionHeader                                                        //
// ------------------------------------------------------------------ //

export function SectionHeader({
  title,
  subtitle,
  right,
}: {
  title: string;
  subtitle?: string;
  right?: ReactNode;
}) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "flex-start",
        justifyContent: "space-between",
        marginBottom: 20,
        gap: 16,
      }}
    >
      <div>
        <h2
          style={{
            fontWeight: 700,
            fontSize: 17,
            color: "#111827",
            letterSpacing: "-0.2px",
            marginBottom: 2,
          }}
        >
          {title}
        </h2>
        {subtitle && (
          <p style={{ fontSize: 13, color: "#9CA3AF", fontWeight: 400 }}>{subtitle}</p>
        )}
      </div>
      {right && <div style={{ flexShrink: 0 }}>{right}</div>}
    </div>
  );
}
