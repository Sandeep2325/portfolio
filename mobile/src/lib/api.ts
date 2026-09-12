import { supabase } from "./supabase";

const BASE = (process.env.EXPO_PUBLIC_API_URL || "").replace(/\/$/, "");

export class ApiError extends Error {
  status: number;
  reason?: string;
  constructor(message: string, status: number, reason?: string) {
    super(message);
    this.status = status;
    this.reason = reason;
  }
}

/** Always read the live token: a refresh since mount must not be missed. */
async function authHeader(): Promise<Record<string, string>> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function parse(response: Response) {
  const text = await response.text();
  const payload = text ? JSON.parse(text) : {};
  if (!response.ok) {
    throw new ApiError(payload.error || `Request failed (${response.status})`, response.status, payload.reason);
  }
  return payload;
}

export async function apiGet<T>(path: string): Promise<T> {
  const response = await fetch(`${BASE}${path}`, { headers: await authHeader() });
  return parse(response) as Promise<T>;
}

export async function apiSend<T>(path: string, method: "POST" | "PATCH" | "DELETE", body?: unknown): Promise<T> {
  const response = await fetch(`${BASE}${path}`, {
    method,
    headers: { "Content-Type": "application/json", ...(await authHeader()) },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  return parse(response) as Promise<T>;
}

/** Multipart upload. React Native accepts {uri,name,type} as a file part. */
export async function apiUpload<T>(path: string, form: FormData): Promise<T> {
  const response = await fetch(`${BASE}${path}`, {
    method: "POST",
    headers: await authHeader(),
    body: form,
  });
  return parse(response) as Promise<T>;
}

export const apiBase = BASE;
