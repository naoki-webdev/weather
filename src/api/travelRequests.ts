import type { BestDeparturePlan, TravelPlan } from "../types/weather";
import { API_BASE_URL, requestJson } from "./client";

export async function fetchTravelPlan(fromId: number, toId: number, departureAt?: string, signal?: AbortSignal): Promise<TravelPlan> {
  const params = new URLSearchParams({ from_id: String(fromId), to_id: String(toId) });
  if (departureAt) params.set("departure_at", departureAt);
  return requestJson<TravelPlan>(`${API_BASE_URL}/api/travel/plan?${params.toString()}`, { signal });
}

export async function fetchBestDeparturePlan(fromId: number, toId: number, windowStart: string, windowEnd: string, intervalMinutes = 15, signal?: AbortSignal): Promise<BestDeparturePlan> {
  const params = new URLSearchParams({
    from_id: String(fromId),
    to_id: String(toId),
    window_start: windowStart,
    window_end: windowEnd,
    interval_minutes: String(intervalMinutes),
  });
  return requestJson<BestDeparturePlan>(`${API_BASE_URL}/api/travel/best-departure?${params.toString()}`, { signal });
}
