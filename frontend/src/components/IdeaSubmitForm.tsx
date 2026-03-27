"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@clerk/nextjs";
import {
  Sparkles,
  Send,
  Loader2,
  CheckCircle,
  AlertCircle,
  ChevronDown,
  Copy,
} from "lucide-react";
import { startWorkflow } from "@/lib/api";
import { toast } from "sonner";

const IDEA_EXAMPLES = [
  "An AI-powered personal finance advisor for Gen Z users that learns spending habits",
  "A B2B SaaS platform for remote team wellness and mental health monitoring",
  "Marketplace connecting vetted local artisans with boutique hotel interior designers",
];

const PIPELINE_STEPS = ["Idea Analysis", "Market Research", "Roadmap", "Tasks", "Report"];

type FormState = "idle" | "submitting" | "success" | "error";

interface SubmitResult {
  run_id: string;
  message: string;
}

interface IdeaFormProps {
  onWorkflowStarted?: (runId: string) => void;
}

export default function IdeaSubmitForm({ onWorkflowStarted }: IdeaFormProps) {
  const { getToken } = useAuth();
  const [idea, setIdea] = useState("");
  const [formState, setFormState] = useState<FormState>("idle");
  const [result, setResult] = useState<SubmitResult | null>(null);
  const [showExamples, setShowExamples] = useState(false);
  const [copied, setCopied] = useState(false);

  const charCount = idea.trim().length;
  const isValid = charCount >= 20 && charCount <= 2000;
  const fillPct = Math.min((charCount / 2000) * 100, 100);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!isValid || formState === "submitting") return;
    setFormState("submitting");
    try {
      const token = (await getToken()) ?? "";
      const response = await startWorkflow(idea.trim(), token);
      setResult({ run_id: response.run_id, message: response.message });
      setFormState("success");
      onWorkflowStarted?.(response.run_id);
      toast.success("VentureNode pipeline launched!", {
        description: `Run ID: ${response.run_id.slice(0, 8)}...`,
      });
    } catch (err) {
      setFormState("error");
      toast.error("Failed to start workflow", {
        description: err instanceof Error ? err.message : "Please check the backend is running.",
      });
    }
  }

  function handleReset() {
    setIdea("");
    setResult(null);
    setFormState("idle");
  }

  function handleCopy() {
    if (!result) return;
    navigator.clipboard.writeText(result.run_id);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div
      style={{
        background: "rgba(255,255,255,0.9)",
        backdropFilter: "blur(16px)",
        WebkitBackdropFilter: "blur(16px)",
        border: "1px solid rgba(124,58,237,0.15)",
        borderRadius: 20,
        padding: 32,
        boxShadow:
          "0 0 0 1px rgba(124,58,237,0.07), 0 4px 24px rgba(124,58,237,0.07), 0 2px 8px rgba(0,0,0,0.04)",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Subtle violet gradient bleed from top-right */}
      <div
        aria-hidden="true"
        style={{
          position: "absolute",
          top: -60,
          right: -60,
          width: 220,
          height: 220,
          borderRadius: "50%",
          background:
            "radial-gradient(circle, rgba(124,58,237,0.1) 0%, transparent 70%)",
          pointerEvents: "none",
        }}
      />

      {/* Header */}
      <div style={{ display: "flex", alignItems: "flex-start", gap: 16, marginBottom: 28, position: "relative" }}>
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", stiffness: 300, damping: 20 }}
          style={{
            width: 50,
            height: 50,
            borderRadius: 16,
            background: "linear-gradient(135deg, #7C3AED 0%, #5B21B6 100%)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
            boxShadow: "0 4px 16px rgba(124,58,237,0.35)",
          }}
        >
          <Sparkles size={22} color="white" />
        </motion.div>
        <div>
          <h2
            style={{
              fontWeight: 800,
              fontSize: 20,
              color: "#111827",
              marginBottom: 4,
              letterSpacing: "-0.4px",
            }}
          >
            Launch AI Analysis
          </h2>
          <p style={{ fontSize: 13.5, color: "#6B7280", lineHeight: 1.5 }}>
            Describe your idea. VentureNode analyzes, researches, plans, and
            creates tasks inside Notion — autonomously.
          </p>
        </div>
      </div>

      {/* Pipeline step track */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 0,
          marginBottom: 24,
          padding: "12px 16px",
          background: "rgba(124,58,237,0.04)",
          border: "1px solid rgba(124,58,237,0.08)",
          borderRadius: 12,
        }}
      >
        {PIPELINE_STEPS.map((step, i, arr) => (
          <div key={step} style={{ display: "flex", alignItems: "center", flex: 1 }}>
            <div style={{ textAlign: "center", flex: 1 }}>
              <div
                style={{
                  width: 24,
                  height: 24,
                  borderRadius: "50%",
                  background:
                    formState === "success"
                      ? "linear-gradient(135deg, #7C3AED, #5B21B6)"
                      : "#F3F4F6",
                  border: `1.5px solid ${formState === "success" ? "#7C3AED" : "#E5E7EB"}`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 10,
                  fontWeight: 700,
                  color: formState === "success" ? "white" : "#9CA3AF",
                  margin: "0 auto 4px",
                  boxShadow:
                    formState === "success"
                      ? "0 2px 8px rgba(124,58,237,0.3)"
                      : "none",
                  transition: "all 350ms",
                }}
              >
                {i + 1}
              </div>
              <p
                style={{
                  fontSize: 9.5,
                  color: formState === "success" ? "#7C3AED" : "#9CA3AF",
                  fontWeight: 600,
                  lineHeight: 1.2,
                  transition: "color 350ms",
                }}
              >
                {step}
              </p>
            </div>
            {i < arr.length - 1 && (
              <div
                style={{
                  width: 20,
                  height: 1.5,
                  background:
                    formState === "success"
                      ? "linear-gradient(90deg, #7C3AED, #DDD6FE)"
                      : "#E5E7EB",
                  flexShrink: 0,
                  transition: "background 350ms",
                }}
              />
            )}
          </div>
        ))}
      </div>

      <AnimatePresence mode="wait">
        {/* ---- SUCCESS STATE ---- */}
        {formState === "success" && result ? (
          <motion.div
            key="success"
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            style={{
              padding: 24,
              borderRadius: 14,
              background: "linear-gradient(135deg, #F0FDF4 0%, #ECFDF5 100%)",
              border: "1px solid #BBF7D0",
              display: "flex",
              flexDirection: "column",
              gap: 14,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <CheckCircle size={20} color="#10B981" />
              <span style={{ fontWeight: 700, color: "#065F46", fontSize: 15 }}>
                Pipeline Running!
              </span>
            </div>
            <p style={{ fontSize: 13, color: "#166534", lineHeight: 1.6 }}>
              {result.message}
            </p>
            {/* Run ID badge */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                padding: "10px 14px",
                background: "white",
                borderRadius: 10,
                border: "1px solid #BBF7D0",
                fontFamily: "monospace",
                fontSize: 12,
                color: "#374151",
              }}
            >
              <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                Run ID: {result.run_id}
              </span>
              <button
                onClick={handleCopy}
                style={{
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  color: copied ? "#10B981" : "#6B7280",
                  display: "flex",
                  alignItems: "center",
                  padding: 0,
                }}
              >
                <Copy size={13} />
              </button>
            </div>
            <p style={{ fontSize: 12, color: "#4B7C5A" }}>
              ✓ Check Notion — approve the Ideas page to continue the pipeline.
            </p>
            <motion.button
              onClick={handleReset}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.97 }}
              style={{
                alignSelf: "flex-start",
                padding: "9px 20px",
                borderRadius: 10,
                border: "1px solid #BBF7D0",
                background: "white",
                color: "#166534",
                fontSize: 13,
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              Submit another idea
            </motion.button>
          </motion.div>
        ) : (
          /* ---- FORM STATE ---- */
          <motion.form
            key="form"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onSubmit={handleSubmit}
          >
            {/* Textarea */}
            <div style={{ position: "relative", marginBottom: 14 }}>
              <textarea
                value={idea}
                onChange={(e) => setIdea(e.target.value)}
                placeholder="Describe your startup idea in detail. The more specific, the better the AI analysis..."
                disabled={formState === "submitting"}
                rows={5}
                style={{
                  width: "100%",
                  padding: "14px 16px",
                  paddingBottom: 36,
                  borderRadius: 12,
                  border: `1.5px solid ${
                    idea.length > 0
                      ? "rgba(124,58,237,0.5)"
                      : "rgba(0,0,0,0.09)"
                  }`,
                  background: "rgba(248,249,252,0.8)",
                  fontSize: 14,
                  color: "#111827",
                  lineHeight: 1.6,
                  resize: "vertical",
                  outline: "none",
                  transition: "border-color 150ms, box-shadow 150ms",
                  fontFamily: "Inter, sans-serif",
                  boxShadow: idea.length > 0
                    ? "0 0 0 3px rgba(124,58,237,0.08)"
                    : "none",
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = "rgba(124,58,237,0.6)";
                  e.target.style.boxShadow = "0 0 0 3px rgba(124,58,237,0.1)";
                }}
                onBlur={(e) => {
                  if (!idea) {
                    e.target.style.borderColor = "rgba(0,0,0,0.09)";
                    e.target.style.boxShadow = "none";
                  }
                }}
              />
              {/* Fill bar */}
              <div
                style={{
                  position: "absolute",
                  bottom: 12,
                  left: 12,
                  right: 12,
                  height: 3,
                  background: "#F3F4F6",
                  borderRadius: 999,
                  overflow: "hidden",
                }}
              >
                <motion.div
                  animate={{ width: `${fillPct}%` }}
                  transition={{ duration: 0.3 }}
                  style={{
                    height: "100%",
                    background:
                      charCount > 1800
                        ? "#EF4444"
                        : charCount >= 20
                        ? "#7C3AED"
                        : "#E5E7EB",
                    borderRadius: 999,
                  }}
                />
              </div>
              {/* Char count */}
              <span
                style={{
                  position: "absolute",
                  bottom: 14,
                  right: 12,
                  fontSize: 10.5,
                  color: charCount > 1800 ? "#EF4444" : "#9CA3AF",
                  fontWeight: 500,
                }}
              >
                {charCount}/2000
              </span>
            </div>

            {/* Validation hint */}
            <AnimatePresence>
              {idea.length > 0 && charCount < 20 && (
                <motion.p
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  style={{
                    fontSize: 12,
                    color: "#F59E0B",
                    marginBottom: 10,
                    paddingLeft: 4,
                  }}
                >
                  Add more detail — at least 20 characters needed.
                </motion.p>
              )}
            </AnimatePresence>

            {/* Examples toggle */}
            <div style={{ marginBottom: 16 }}>
              <button
                type="button"
                onClick={() => setShowExamples(!showExamples)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 5,
                  fontSize: 12.5,
                  color: "#7C3AED",
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  fontWeight: 600,
                  padding: 0,
                }}
              >
                <span>See example ideas</span>
                <motion.span animate={{ rotate: showExamples ? 180 : 0 }}>
                  <ChevronDown size={12} />
                </motion.span>
              </button>

              <AnimatePresence>
                {showExamples && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    style={{ overflow: "hidden", marginTop: 10 }}
                  >
                    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                      {IDEA_EXAMPLES.map((ex, i) => (
                        <motion.button
                          key={i}
                          type="button"
                          onClick={() => setIdea(ex)}
                          whileHover={{ x: 3 }}
                          style={{
                            padding: "9px 12px",
                            borderRadius: 10,
                            border: "1px solid rgba(0,0,0,0.07)",
                            background: "rgba(248,249,252,0.8)",
                            textAlign: "left",
                            fontSize: 12.5,
                            color: "#4B5563",
                            cursor: "pointer",
                            lineHeight: 1.5,
                            fontFamily: "Inter, sans-serif",
                            transition: "all 150ms",
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.borderColor = "rgba(124,58,237,0.3)";
                            e.currentTarget.style.background = "#EDE9FE";
                            e.currentTarget.style.color = "#5B21B6";
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.borderColor = "rgba(0,0,0,0.07)";
                            e.currentTarget.style.background = "rgba(248,249,252,0.8)";
                            e.currentTarget.style.color = "#4B5563";
                          }}
                        >
                          {ex}
                        </motion.button>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Error banner */}
            <AnimatePresence>
              {formState === "error" && (
                <motion.div
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    padding: "10px 14px",
                    borderRadius: 10,
                    background: "#FEF2F2",
                    border: "1px solid #FECACA",
                    marginBottom: 14,
                  }}
                >
                  <AlertCircle size={14} color="#EF4444" />
                  <span style={{ fontSize: 12.5, color: "#DC2626", fontWeight: 500 }}>
                    Backend unreachable. Check server and Notion DB IDs.
                  </span>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Submit button */}
            <motion.button
              type="submit"
              disabled={!isValid || formState === "submitting"}
              whileHover={isValid ? { y: -1, scale: 1.005 } : {}}
              whileTap={isValid ? { scale: 0.97 } : {}}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
                width: "100%",
                padding: "14px 24px",
                borderRadius: 14,
                border: "none",
                background:
                  !isValid || formState === "submitting"
                    ? "#F3F4F6"
                    : "linear-gradient(135deg, #7C3AED 0%, #5B21B6 100%)",
                color:
                  !isValid || formState === "submitting" ? "#9CA3AF" : "white",
                fontSize: 15,
                fontWeight: 700,
                cursor: !isValid || formState === "submitting" ? "not-allowed" : "pointer",
                fontFamily: "Inter, sans-serif",
                boxShadow:
                  isValid && formState !== "submitting"
                    ? "0 4px 20px rgba(124,58,237,0.30)"
                    : "none",
                transition: "all 200ms",
                letterSpacing: "-0.1px",
              }}
            >
              {formState === "submitting" ? (
                <>
                  <Loader2 size={16} style={{ animation: "spin 1s linear infinite" }} />
                  <span>Launching agents...</span>
                </>
              ) : (
                <>
                  <Send size={16} />
                  <span>Analyze with VentureNode</span>
                </>
              )}
            </motion.button>

            <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
          </motion.form>
        )}
      </AnimatePresence>
    </div>
  );
}
