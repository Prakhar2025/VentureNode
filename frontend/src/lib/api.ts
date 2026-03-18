/**
 * VentureNode — API Communication Layer.
 *
 * This is the single point of contact between the Next.js frontend
 * and the FastAPI backend. All HTTP requests go through this module.
 *
 * Contract: mirrors the FastAPI route definitions in backend/api/routes.py.
 */

import axios, { AxiosInstance, AxiosError } from "axios";

// ------------------------------------------------------------------ //
// Types                                                                //
// ------------------------------------------------------------------ //

export interface HealthResponse {
  status: string;
  version: string;
  notion: {
    connected: boolean;
    user?: string;
    type?: string;
    error?: string;
  };
}

export interface WorkflowStartRequest {
  idea: string;
}

export interface WorkflowStartResponse {
  run_id: string;
  status: string;
  message: string;
}

export interface WorkflowStatusResponse {
  run_id: string;
  status: string;
  message: string;
}

export interface NotionRecord {
  id: string;
  properties: Record<string, unknown>;
  created_time: string;
  last_edited_time: string;
  url: string;
}

export interface NotionListResponse {
  count: number;
  results: NotionRecord[];
}

export type AgentStatus = "idle" | "running" | "done" | "error";

// ------------------------------------------------------------------ //
// Axios Instance                                                        //
// ------------------------------------------------------------------ //

const BASE_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api/v1";

const apiClient: AxiosInstance = axios.create({
  baseURL: BASE_URL,
  timeout: 30_000,
  headers: {
    "Content-Type": "application/json",
    Accept: "application/json",
  },
});

// ------------------------------------------------------------------ //
// Error normalizer                                                      //
// ------------------------------------------------------------------ //

function normalizeError(error: unknown): never {
  if (error instanceof AxiosError) {
    const msg =
      error.response?.data?.detail ??
      error.response?.data?.message ??
      error.message ??
      "An unexpected error occurred";
    throw new Error(String(msg));
  }
  throw error;
}

// ------------------------------------------------------------------ //
// Health                                                                //
// ------------------------------------------------------------------ //

export async function getHealth(): Promise<HealthResponse> {
  try {
    const { data } = await apiClient.get<HealthResponse>("/health");
    return data;
  } catch (error) {
    normalizeError(error);
  }
}

// ------------------------------------------------------------------ //
// Workflow                                                              //
// ------------------------------------------------------------------ //

export async function startWorkflow(
  idea: string
): Promise<WorkflowStartResponse> {
  try {
    const { data } = await apiClient.post<WorkflowStartResponse>(
      "/workflow/start",
      { idea } satisfies WorkflowStartRequest
    );
    return data;
  } catch (error) {
    normalizeError(error);
  }
}

export async function getWorkflowStatus(
  runId: string
): Promise<WorkflowStatusResponse> {
  try {
    const { data } = await apiClient.get<WorkflowStatusResponse>(
      `/workflow/${runId}/status`
    );
    return data;
  } catch (error) {
    normalizeError(error);
  }
}

// ------------------------------------------------------------------ //
// Notion Database Reads                                                 //
// ------------------------------------------------------------------ //

export async function getIdeas(): Promise<NotionListResponse> {
  try {
    const { data } = await apiClient.get<NotionListResponse>("/notion/ideas");
    return data;
  } catch (error) {
    normalizeError(error);
  }
}

export async function getResearch(): Promise<NotionListResponse> {
  try {
    const { data } =
      await apiClient.get<NotionListResponse>("/notion/research");
    return data;
  } catch (error) {
    normalizeError(error);
  }
}

export async function getRoadmap(): Promise<NotionListResponse> {
  try {
    const { data } = await apiClient.get<NotionListResponse>("/notion/roadmap");
    return data;
  } catch (error) {
    normalizeError(error);
  }
}

export async function getTasks(): Promise<NotionListResponse> {
  try {
    const { data } = await apiClient.get<NotionListResponse>("/notion/tasks");
    return data;
  } catch (error) {
    normalizeError(error);
  }
}

// ------------------------------------------------------------------ //
// Monitor                                                               //
// ------------------------------------------------------------------ //

export async function triggerReportGeneration(): Promise<{
  status: string;
  message: string;
}> {
  try {
    const { data } = await apiClient.post("/monitor/report");
    return data;
  } catch (error) {
    normalizeError(error);
  }
}

// ------------------------------------------------------------------ //
// Helpers                                                               //
// ------------------------------------------------------------------ //

/**
 * Extract plain text from a Notion rich_text or title property.
 */
export function extractText(
  property: unknown,
  fallback = "Untitled"
): string {
  if (!property || typeof property !== "object") return fallback;
  const prop = property as Record<string, unknown>;

  const arr =
    (prop.title as Array<{ plain_text?: string }> | undefined) ??
    (prop.rich_text as Array<{ plain_text?: string }> | undefined) ??
    [];

  return arr.map((t) => t.plain_text ?? "").join("") || fallback;
}

/**
 * Extract a select option name from a Notion select property.
 */
export function extractSelect(
  property: unknown,
  fallback = ""
): string {
  if (!property || typeof property !== "object") return fallback;
  const prop = property as Record<string, unknown>;
  const select = prop.select as Record<string, string> | undefined;
  return select?.name ?? fallback;
}

/**
 * Extract a number value from a Notion number property.
 */
export function extractNumber(
  property: unknown,
  fallback = 0
): number {
  if (!property || typeof property !== "object") return fallback;
  const prop = property as Record<string, unknown>;
  return (prop.number as number) ?? fallback;
}

/**
 * Extract a checkbox value from a Notion checkbox property.
 */
export function extractCheckbox(property: unknown): boolean {
  if (!property || typeof property !== "object") return false;
  const prop = property as Record<string, unknown>;
  return Boolean(prop.checkbox);
}
