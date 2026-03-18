"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, Send, Loader2, CheckCircle, AlertCircle, ChevronDown } from "lucide-react";
import { startWorkflow } from "@/lib/api";
import { toast } from "sonner";

const IDEA_EXAMPLES = [
  "An AI-powered personal finance advisor for Gen Z users that learns spending habits",
  "A B2B SaaS platform for remote team wellness and mental health monitoring",
  "Marketplace connecting vetted local artisans with boutique hotel interior designers",
];

type FormState = "idle" | "submitting" | "success" | "error";

interface SubmitResult {
  run_id: string;
  message: string;
}

interface IdeaFormProps {
  onWorkflowStarted?: (runId: string) => void;
}

export default function IdeaSubmitForm({ onWorkflowStarted }: IdeaFormProps) {
  const [idea, setIdea] = useState("");
  const [formState, setFormState] = useState<FormState>("idle");
  const [result, setResult] = useState<SubmitResult | null>(null);
  const [showExamples, setShowExamples] = useState(false);

  const charCount = idea.trim().length;
  const isValid = charCount >= 20 && charCount <= 2000;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!isValid || formState === "submitting") return;

    setFormState("submitting");
    try {
      const response = await startWorkflow(idea.trim());
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

  return (
    <div
      className="card"
      style={{
        padding: 32,
        background: "linear-gradient(135deg, #fafafa 0%, #f0f4ff 100%)",
        border: "1px solid var(--color-brand-border)",
      }}
    >
      {/* Header */}
      <div style={{ display: "flex", alignItems: "flex-start", gap: 16, marginBottom: 24 }}>
        <div
          style={{
            width: 48,
            height: 48,
            borderRadius: "var(--radius-lg)",
            background: "linear-gradient(135deg, #6366f1 0%, #06b6d4 100%)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          }}
        >
          <Sparkles size={22} color="white" />
        </div>
        <div>
          <h2
            style={{
              fontWeight: 700,
              fontSize: 20,
              color: "var(--color-text-primary)",
              marginBottom: 4,
              letterSpacing: "-0.3px",
            }}
          >
            Launch AI Analysis
          </h2>
          <p style={{ fontSize: 14, color: "var(--color-text-secondary)", lineHeight: 1.5 }}>
            Describe your startup idea and VentureNode will analyze it, research the market,
            generate a roadmap, and create actionable tasks — all inside your Notion workspace.
          </p>
        </div>
      </div>

      <AnimatePresence mode="wait">
        {formState === "success" && result ? (
          <motion.div
            key="success"
            initial={{ opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            style={{
              padding: 24,
              borderRadius: "var(--radius-lg)",
              background: "#f0fdf4",
              border: "1px solid #bbf7d0",
              display: "flex",
              flexDirection: "column",
              gap: 12,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <CheckCircle size={20} color="var(--color-success)" />
              <span style={{ fontWeight: 600, color: "var(--color-success)" }}>
                Pipeline Running!
              </span>
            </div>
            <p style={{ fontSize: 13, color: "#166534", lineHeight: 1.6 }}>
              {result.message}
            </p>
            <div
              style={{
                padding: "10px 14px",
                background: "white",
                borderRadius: "var(--radius-md)",
                border: "1px solid #bbf7d0",
                fontFamily: "monospace",
                fontSize: 12,
                color: "#374151",
              }}
            >
              Run ID: {result.run_id}
            </div>
            <p style={{ fontSize: 12, color: "#4b7c5a" }}>
              ✓ Check your Notion workspace — the Ideas page will appear shortly. Approve it to continue the pipeline.
            </p>
            <button
              onClick={handleReset}
              style={{
                alignSelf: "flex-start",
                padding: "8px 16px",
                borderRadius: "var(--radius-md)",
                border: "1px solid #bbf7d0",
                background: "white",
                color: "#166534",
                fontSize: 13,
                fontWeight: 500,
                cursor: "pointer",
                transition: "all var(--transition-fast)",
              }}
            >
              Submit another idea
            </button>
          </motion.div>
        ) : (
          <motion.form
            key="form"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onSubmit={handleSubmit}
          >
            {/* Textarea */}
            <div style={{ position: "relative", marginBottom: 12 }}>
              <textarea
                value={idea}
                onChange={(e) => setIdea(e.target.value)}
                placeholder="Describe your startup idea in detail. The more specific, the better the analysis..."
                disabled={formState === "submitting"}
                rows={5}
                style={{
                  width: "100%",
                  padding: "14px 16px",
                  borderRadius: "var(--radius-md)",
                  border: `1.5px solid ${idea.length > 0 ? "var(--color-brand)" : "var(--color-border)"}`,
                  background: "white",
                  fontSize: 14,
                  color: "var(--color-text-primary)",
                  lineHeight: 1.6,
                  resize: "vertical",
                  outline: "none",
                  transition: "border-color var(--transition-fast)",
                  fontFamily: "var(--font-sans)",
                }}
              />
              {/* Char count */}
              <span
                style={{
                  position: "absolute",
                  bottom: 10,
                  right: 12,
                  fontSize: 11,
                  color: charCount > 1800 ? "var(--color-error)" : "var(--color-text-muted)",
                }}
              >
                {charCount}/2000
              </span>
            </div>

            {/* Validation hint */}
            {idea.length > 0 && charCount < 20 && (
              <motion.p
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                style={{ fontSize: 12, color: "var(--color-warning)", marginBottom: 8 }}
              >
                Please add more detail (at least 20 characters)
              </motion.p>
            )}

            {/* Examples */}
            <div style={{ marginBottom: 16 }}>
              <button
                type="button"
                onClick={() => setShowExamples(!showExamples)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 4,
                  fontSize: 12,
                  color: "var(--color-brand)",
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  fontWeight: 500,
                  padding: 0,
                }}
              >
                <span>See example ideas</span>
                <motion.span animate={{ rotate: showExamples ? 180 : 0 }} transition={{ duration: 0.2 }}>
                  <ChevronDown size={12} />
                </motion.span>
              </button>
              <AnimatePresence>
                {showExamples && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    style={{ overflow: "hidden", marginTop: 8 }}
                  >
                    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                      {IDEA_EXAMPLES.map((ex, i) => (
                        <button
                          key={i}
                          type="button"
                          onClick={() => setIdea(ex)}
                          style={{
                            padding: "8px 12px",
                            borderRadius: "var(--radius-md)",
                            border: "1px solid var(--color-border)",
                            background: "white",
                            textAlign: "left",
                            fontSize: 12,
                            color: "var(--color-text-secondary)",
                            cursor: "pointer",
                            lineHeight: 1.5,
                            transition: "all var(--transition-fast)",
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.borderColor = "var(--color-brand)";
                            e.currentTarget.style.background = "var(--color-brand-light)";
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.borderColor = "var(--color-border)";
                            e.currentTarget.style.background = "white";
                          }}
                        >
                          {ex}
                        </button>
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
                    borderRadius: "var(--radius-md)",
                    background: "#fef2f2",
                    border: "1px solid #fecaca",
                    marginBottom: 12,
                  }}
                >
                  <AlertCircle size={14} color="var(--color-error)" />
                  <span style={{ fontSize: 12, color: "var(--color-error)", fontWeight: 500 }}>
                    Make sure the backend is running and all Notion database IDs are set.
                  </span>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Submit button */}
            <motion.button
              type="submit"
              disabled={!isValid || formState === "submitting"}
              whileTap={{ scale: 0.98 }}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
                width: "100%",
                padding: "13px 24px",
                borderRadius: "var(--radius-md)",
                border: "none",
                background:
                  !isValid || formState === "submitting"
                    ? "var(--color-surface-2)"
                    : "linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)",
                color: !isValid || formState === "submitting" ? "var(--color-text-muted)" : "white",
                fontSize: 15,
                fontWeight: 600,
                cursor: !isValid || formState === "submitting" ? "not-allowed" : "pointer",
                transition: "all var(--transition-fast)",
                fontFamily: "var(--font-sans)",
                boxShadow: isValid && formState !== "submitting"
                  ? "0 4px 14px rgb(99 102 241 / 0.3)"
                  : "none",
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
          </motion.form>
        )}
      </AnimatePresence>

      {/* Pipeline steps preview */}
      <div
        style={{
          marginTop: 20,
          paddingTop: 20,
          borderTop: "1px solid var(--color-brand-border)",
          display: "flex",
          gap: 0,
          alignItems: "center",
        }}
      >
        {[
          "Idea Analysis",
          "Market Research",
          "Roadmap",
          "Tasks",
          "Report",
        ].map((step, i, arr) => (
          <div key={step} style={{ display: "flex", alignItems: "center", flex: 1 }}>
            <div style={{ textAlign: "center", flex: 1 }}>
              <div
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: "50%",
                  background: formState === "success" ? "var(--color-brand-light)" : "var(--color-surface)",
                  border: `1.5px solid ${formState === "success" ? "var(--color-brand)" : "var(--color-border)"}`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 11,
                  fontWeight: 600,
                  color: formState === "success" ? "var(--color-brand)" : "var(--color-text-muted)",
                  margin: "0 auto 4px",
                }}
              >
                {i + 1}
              </div>
              <p style={{ fontSize: 10, color: "var(--color-text-muted)", fontWeight: 500, lineHeight: 1.2 }}>
                {step}
              </p>
            </div>
            {i < arr.length - 1 && (
              <div style={{ width: 24, height: 1, background: "var(--color-border)", flexShrink: 0 }} />
            )}
          </div>
        ))}
      </div>

      <style jsx global>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
