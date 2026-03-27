"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
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
  Settings,
  Bell,
} from "lucide-react";
import { UserButton } from "@clerk/nextjs";

const NAV_GROUPS = [
  {
    label: "Workspace",
    items: [
      { href: "/", label: "Dashboard", icon: LayoutDashboard },
      { href: "/ideas", label: "Ideas", icon: Lightbulb },
      { href: "/research", label: "Research", icon: TrendingUp },
    ],
  },
  {
    label: "Execution",
    items: [
      { href: "/roadmap", label: "Roadmap", icon: Map },
      { href: "/tasks", label: "Tasks", icon: CheckSquare },
      { href: "/reports", label: "Reports", icon: BarChart3 },
    ],
  },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside
      style={{
        width: 256,
        minHeight: "100vh",
        background: "rgba(255,255,255,0.82)",
        backdropFilter: "blur(20px)",
        WebkitBackdropFilter: "blur(20px)",
        borderRight: "1px solid rgba(0,0,0,0.06)",
        display: "flex",
        flexDirection: "column",
        padding: "20px 12px",
        position: "fixed",
        top: 0,
        left: 0,
        zIndex: 50,
        boxShadow: "2px 0 16px rgba(0,0,0,0.03)",
      }}
    >
      {/* Logo */}
      <Link href="/" style={{ textDecoration: "none", marginBottom: 28, display: "block" }}>
        <motion.div
          whileHover={{ scale: 1.02 }}
          style={{ display: "flex", alignItems: "center", gap: 12, padding: "8px 10px", borderRadius: 14 }}
        >
          <div
            style={{
              width: 38,
              height: 38,
              borderRadius: 12,
              background: "linear-gradient(135deg, #7C3AED 0%, #5B21B6 100%)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: "0 4px 14px rgba(124,58,237,0.35)",
              flexShrink: 0,
            }}
          >
            <Zap size={18} color="white" strokeWidth={2.5} />
          </div>
          <div>
            <span
              style={{
                fontWeight: 800,
                fontSize: 16,
                color: "#111827",
                letterSpacing: "-0.4px",
                display: "block",
                lineHeight: 1.2,
              }}
            >
              VentureNode
            </span>
            <span style={{ fontSize: 10.5, color: "#9CA3AF", fontWeight: 500, letterSpacing: "0.02em" }}>
              AI Operating System
            </span>
          </div>
        </motion.div>
      </Link>

      {/* Nav groups */}
      <nav style={{ flex: 1, display: "flex", flexDirection: "column", gap: 24 }}>
        {NAV_GROUPS.map((group) => (
          <div key={group.label}>
            <p
              style={{
                fontSize: 10.5,
                fontWeight: 700,
                letterSpacing: "0.1em",
                color: "#9CA3AF",
                textTransform: "uppercase",
                marginBottom: 6,
                paddingLeft: 10,
              }}
            >
              {group.label}
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: 1 }}>
              {group.items.map(({ href, label, icon: Icon }) => {
                const isActive = pathname === href;
                return (
                  <Link key={href} href={href} style={{ textDecoration: "none" }}>
                    <motion.div
                      whileHover={{ x: 2 }}
                      whileTap={{ scale: 0.97 }}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 10,
                        padding: "9px 10px",
                        borderRadius: 12,
                        color: isActive ? "#7C3AED" : "#4B5563",
                        fontWeight: isActive ? 600 : 500,
                        fontSize: 14,
                        cursor: "pointer",
                        position: "relative",
                        overflow: "hidden",
                      }}
                    >
                      {isActive && (
                        <motion.div
                          layoutId="active-nav-bg"
                          style={{
                            position: "absolute",
                            inset: 0,
                            background: "linear-gradient(135deg, rgba(124,58,237,0.1) 0%, rgba(124,58,237,0.05) 100%)",
                            borderRadius: 12,
                            border: "1px solid rgba(124,58,237,0.15)",
                          }}
                          transition={{ type: "spring", stiffness: 400, damping: 35 }}
                        />
                      )}

                      {/* Active left accent */}
                      <AnimatePresence>
                        {isActive && (
                          <motion.div
                            initial={{ scaleY: 0 }}
                            animate={{ scaleY: 1 }}
                            exit={{ scaleY: 0 }}
                            style={{
                              position: "absolute",
                              left: 0,
                              top: "50%",
                              transform: "translateY(-50%)",
                              width: 3,
                              height: 18,
                              background: "#7C3AED",
                              borderRadius: 999,
                              boxShadow: "0 0 8px rgba(124,58,237,0.5)",
                            }}
                          />
                        )}
                      </AnimatePresence>

                      <div
                        style={{
                          width: 30,
                          height: 30,
                          borderRadius: 8,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          background: isActive ? "rgba(124,58,237,0.12)" : "transparent",
                          color: isActive ? "#7C3AED" : "#6B7280",
                          flexShrink: 0,
                          position: "relative",
                          transition: "all 150ms",
                        }}
                      >
                        <Icon size={15} strokeWidth={isActive ? 2.5 : 2} />
                      </div>

                      <span style={{ position: "relative" }}>{label}</span>
                    </motion.div>
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Bottom section */}
      <div
        style={{
          borderTop: "1px solid rgba(0,0,0,0.06)",
          paddingTop: 16,
          display: "flex",
          flexDirection: "column",
          gap: 2,
        }}
      >
        {/* Clerk user button */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            padding: "10px 10px",
            borderRadius: 12,
            marginBottom: 4,
          }}
        >
          <UserButton
            appearance={{
              elements: {
                avatarBox: { width: 30, height: 30 },
              },
            }}
          />
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ fontSize: 13, fontWeight: 600, color: "#111827", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              My Account
            </p>
            <p style={{ fontSize: 11, color: "#9CA3AF" }}>Founder</p>
          </div>
        </div>

        {/* GitHub link */}
        <a
          href="https://github.com/Prakhar2025/VentureNode"
          target="_blank"
          rel="noopener noreferrer"
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            padding: "8px 10px",
            borderRadius: 10,
            color: "#9CA3AF",
            fontSize: 13,
            textDecoration: "none",
            transition: "all 150ms",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = "rgba(0,0,0,0.03)";
            e.currentTarget.style.color = "#6B7280";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = "transparent";
            e.currentTarget.style.color = "#9CA3AF";
          }}
        >
          <Github size={13} />
          <span>GitHub</span>
          <ExternalLink size={11} style={{ marginLeft: "auto" }} />
        </a>

        <div style={{ padding: "6px 10px", fontSize: 10.5, color: "#D1D5DB", fontWeight: 500 }}>
          v2.0.0 — Sprint 3 · EthAum AI
        </div>
      </div>
    </aside>
  );
}
