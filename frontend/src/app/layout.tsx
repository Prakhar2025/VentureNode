import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";
import { ClerkProvider } from "@clerk/nextjs";
import { Toaster } from "sonner";

export const metadata: Metadata = {
  title: {
    default: "VentureNode — AI Startup Operating System",
    template: "%s | VentureNode",
  },
  description:
    "VentureNode is an autonomous multi-agent AI OS for startups. Analyze ideas, research markets, generate roadmaps, and track execution — all inside Notion.",
  keywords: ["AI startup", "LangGraph", "Notion", "multi-agent", "VentureNode"],
  authors: [{ name: "Prakhar Shukla" }],
  openGraph: {
    title: "VentureNode — AI Startup Operating System",
    description: "Autonomous AI agents that turn your startup idea into an actionable plan, live inside Notion.",
    type: "website",
    locale: "en_US",
  },
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <ClerkProvider
      publishableKey={process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY!}
    >
      <html lang="en" suppressHydrationWarning>
        <head>
          <link rel="preconnect" href="https://fonts.googleapis.com" />
          <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
          <link
            rel="stylesheet"
            href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap"
          />
        </head>
        <body>
          {/* EthAum AI Mesh Gradient Background — rendered once, stays fixed */}
          <div className="mesh-gradient" aria-hidden="true">
            <div className="mesh-orb mesh-orb-1" />
            <div className="mesh-orb mesh-orb-2" />
            <div className="mesh-orb mesh-orb-3" />
          </div>

          {children}

          <Toaster
            position="bottom-right"
            toastOptions={{
              style: {
                fontFamily: "var(--font-sans)",
                borderRadius: "14px",
                border: "1px solid rgba(0,0,0,0.07)",
                background: "rgba(255,255,255,0.92)",
                backdropFilter: "blur(12px)",
                boxShadow: "0 8px 24px rgba(0,0,0,0.08)",
                fontSize: "14px",
              },
            }}
          />
        </body>
      </html>
    </ClerkProvider>
  );
}
