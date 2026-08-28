import type { SessionResponse } from "../types/auth";
import { API_BASE_URL, requestJson, requestVoid } from "./client";

export async function createSession(email: string, password: string): Promise<SessionResponse> {
  return requestJson<SessionResponse>(`${API_BASE_URL}/api/session`, {
    method: "POST",
    body: JSON.stringify({ session: { email, password } }),
  });
}

export async function fetchCurrentSession(): Promise<SessionResponse> {
  return requestJson<SessionResponse>(`${API_BASE_URL}/api/session`);
}

export async function deleteSession(): Promise<void> {
  return requestVoid(`${API_BASE_URL}/api/session`, { method: "DELETE" });
}
