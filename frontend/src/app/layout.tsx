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
    "VentureNode is an autonomous multi-agent AI operating system for startups. Analyze ideas, research markets, generate roadmaps, and track execution — all inside Notion.",
  keywords: [
    "AI startup",
    "LangGraph",
    "Notion",
    "multi-agent",
    "startup OS",
    "VentureNode",
  ],
  authors: [{ name: "Prakhar Shukla" }],
  openGraph: {
    title: "VentureNode — AI Startup Operating System",
    description:
      "Autonomous AI agents that turn your startup idea into an actionable plan, live inside Notion.",
    type: "website",
    locale: "en_US",
  },
};

export default function RootLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <ClerkProvider
      publishableKey={process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY!}
      signInUrl="/sign-in"
      signUpUrl="/sign-up"
      afterSignInUrl="/"
      afterSignUpUrl="/"
    >
      <html lang="en" suppressHydrationWarning>
        <head>
          <link rel="preconnect" href="https://fonts.googleapis.com" />
          <link
            rel="preconnect"
            href="https://fonts.gstatic.com"
            crossOrigin="anonymous"
          />
        </head>
        <body>
          {children}
          <Toaster
            position="bottom-right"
            toastOptions={{
              style: {
                fontFamily: "var(--font-sans)",
                borderRadius: "var(--radius-md)",
                border: "1px solid var(--color-border)",
                fontSize: "14px",
              },
            }}
          />
        </body>
      </html>
    </ClerkProvider>
  );
}
