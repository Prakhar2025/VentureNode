/**
 * VentureNode — API Communication Layer.
 *
 * This is the single point of contact between the Next.js frontend
 * and the FastAPI backend. All HTTP requests go through this module.
 *
 * Security: Every mutating/reading request attaches the Clerk JWT in the
 * Authorization: Bearer header so FastAPI can enforce tenant isolation.
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
  step?: string;
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

/** Base (unauthenticated) client — for public endpoints only. */
const publicClient: AxiosInstance = axios.create({
  baseURL: BASE_URL,
  timeout: 30_000,
  headers: {
    "Content-Type": "application/json",
    Accept: "application/json",
  },
});

/**
 * Create a per-request authenticated Axios client.
 *
 * @param token - Raw Clerk JWT string. Obtain via Clerk's `useAuth().getToken()`.
 * @returns Axios instance with `Authorization: Bearer <token>` pre-set.
 */
function createAuthClient(token: string): AxiosInstance {
  return axios.create({
    baseURL: BASE_URL,
    timeout: 120_000,
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      Authorization: `Bearer ${token}`,
    },
  });
}

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
    const { data } = await publicClient.get<HealthResponse>("/health");
    return data;
  } catch (error) {
    normalizeError(error);
  }
}


// ------------------------------------------------------------------ //
// Workflow                                                              //
// ------------------------------------------------------------------ //

export async function startWorkflow(
  idea: string,
  token: string
): Promise<WorkflowStartResponse> {
  try {
    const { data } = await createAuthClient(token).post<WorkflowStartResponse>(
      "/workflow/start",
      { idea } satisfies WorkflowStartRequest
    );
    return data;
  } catch (error) {
    normalizeError(error);
  }
}

export async function getWorkflowStatus(
  runId: string,
  token: string
): Promise<WorkflowStatusResponse> {
  try {
    const { data } = await createAuthClient(token).get<WorkflowStatusResponse>(
      `/workflow/${runId}/status`
    );
    return data;
  } catch (error) {
    normalizeError(error);
  }
}

// ------------------------------------------------------------------ //
// Notion Database Reads — token is required (always pass Clerk JWT)   //
// ------------------------------------------------------------------ //

export async function getIdeas(token: string = ""): Promise<NotionListResponse> {
  try {
    const { data } = await createAuthClient(token).get<NotionListResponse>("/notion/ideas");
    return data;
  } catch (error) {
    normalizeError(error);
  }
}

export async function getResearch(token: string = ""): Promise<NotionListResponse> {
  try {
    const { data } =
      await createAuthClient(token).get<NotionListResponse>("/notion/research");
    return data;
  } catch (error) {
    normalizeError(error);
  }
}

export async function getRoadmap(token: string = ""): Promise<NotionListResponse> {
  try {
    const { data } = await createAuthClient(token).get<NotionListResponse>("/notion/roadmap");
    return data;
  } catch (error) {
    normalizeError(error);
  }
}

export async function getTasks(token: string = ""): Promise<NotionListResponse> {
  try {
    const { data } = await createAuthClient(token).get<NotionListResponse>("/notion/tasks");
    return data;
  } catch (error) {
    normalizeError(error);
  }
}

export async function getReports(token: string = ""): Promise<NotionListResponse> {
  try {
    const { data } = await createAuthClient(token).get<NotionListResponse>("/notion/reports");
    return data;
  } catch (error) {
    normalizeError(error);
  }
}
// ------------------------------------------------------------------ //
// Monitor                                                               //
// ------------------------------------------------------------------ //

export async function triggerReportGeneration(token: string = ""): Promise<{
  status: string;
  message: string;
}> {
  try {
    const { data } = await createAuthClient(token).post("/monitor/report");
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
