"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import {
  LayoutDashboard,
  Lightbulb,
  TrendingUp,
  Map,
  CheckSquare,
  BarChart3,
  Zap,
  ExternalLink,
  Github,
} from "lucide-react";

const NAV_ITEMS = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/ideas", label: "Ideas", icon: Lightbulb },
  { href: "/research", label: "Research", icon: TrendingUp },
  { href: "/roadmap", label: "Roadmap", icon: Map },
  { href: "/tasks", label: "Tasks", icon: CheckSquare },
  { href: "/reports", label: "Reports", icon: BarChart3 },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside
      style={{
        width: 240,
        minHeight: "100vh",
        borderRight: "1px solid var(--color-border)",
        background: "var(--color-bg)",
        display: "flex",
        flexDirection: "column",
        padding: "24px 16px",
        position: "fixed",
        top: 0,
        left: 0,
        zIndex: 50,
      }}
    >
      {/* Logo */}
      <Link href="/" style={{ textDecoration: "none", marginBottom: 32 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: "var(--radius-md)",
              background: "linear-gradient(135deg, #6366f1 0%, #06b6d4 100%)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Zap size={18} color="white" strokeWidth={2.5} />
          </div>
          <span
            style={{
              fontWeight: 700,
              fontSize: 17,
              color: "var(--color-text-primary)",
              letterSpacing: "-0.3px",
            }}
          >
            VentureNode
          </span>
        </div>
      </Link>

      {/* Nav label */}
      <p
        style={{
          fontSize: 11,
          fontWeight: 600,
          letterSpacing: "0.08em",
          color: "var(--color-text-muted)",
          textTransform: "uppercase",
          marginBottom: 8,
          paddingLeft: 12,
        }}
      >
        Workspace
      </p>

      {/* Nav items */}
      <nav style={{ display: "flex", flexDirection: "column", gap: 2, flex: 1 }}>
        {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
          const isActive = pathname === href;
          return (
            <Link key={href} href={href} style={{ textDecoration: "none" }}>
              <motion.div
                whileHover={{ x: 2 }}
                whileTap={{ scale: 0.98 }}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  padding: "9px 12px",
                  borderRadius: "var(--radius-md)",
                  background: isActive
                    ? "var(--color-brand-light)"
                    : "transparent",
                  color: isActive
                    ? "var(--color-brand)"
                    : "var(--color-text-secondary)",
                  fontWeight: isActive ? 600 : 500,
                  fontSize: 14,
                  cursor: "pointer",
                  transition: "all var(--transition-fast)",
                  position: "relative",
                }}
              >
                {isActive && (
                  <motion.div
                    layoutId="active-nav"
                    style={{
                      position: "absolute",
                      inset: 0,
                      background: "var(--color-brand-light)",
                      borderRadius: "var(--radius-md)",
                      border: "1px solid var(--color-brand-border)",
                    }}
                    transition={{ type: "spring", stiffness: 400, damping: 35 }}
                  />
                )}
                <Icon size={16} strokeWidth={isActive ? 2.5 : 2} style={{ position: "relative" }} />
                <span style={{ position: "relative" }}>{label}</span>
              </motion.div>
            </Link>
          );
        })}
      </nav>

      {/* Footer links */}
      <div
        style={{
          borderTop: "1px solid var(--color-border)",
          paddingTop: 16,
          display: "flex",
          flexDirection: "column",
          gap: 4,
        }}
      >
        <a
          href="https://github.com/Prakhar2025/VentureNode"
          target="_blank"
          rel="noopener noreferrer"
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            padding: "8px 12px",
            borderRadius: "var(--radius-md)",
            color: "var(--color-text-muted)",
            fontSize: 13,
            textDecoration: "none",
            transition: "all var(--transition-fast)",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = "var(--color-surface)";
            e.currentTarget.style.color = "var(--color-text-secondary)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = "transparent";
            e.currentTarget.style.color = "var(--color-text-muted)";
          }}
        >
          <Github size={14} />
          <span>GitHub</span>
          <ExternalLink size={12} style={{ marginLeft: "auto" }} />
        </a>
        <div
          style={{
            padding: "8px 12px",
            fontSize: 11,
            color: "var(--color-text-muted)",
          }}
        >
          v1.0.0 — Notion MCP Challenge
        </div>
      </div>
    </aside>
  );
}
