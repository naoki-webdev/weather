import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

import { currentRequestId } from "../observability/request-context";
import { logStructured } from "../observability/structured-log";

export class RouteRequestError extends Error {}

type Coordinates = { latitude: unknown; longitude: unknown };
const MAX_ROUTE_DURATION_SECONDS = 7 * 24 * 60 * 60;

@Injectable()
export class RouteClient {
  private readonly timeoutMs = 10_000;

  constructor(private readonly config: ConfigService) {}

  async routeFor(from: Coordinates, to: Coordinates) {
    const baseUrl = this.config.get<string>("OSRM_BASE_URL", "https://router.project-osrm.org").replace(/\/$/, "");
    const coordinates = `${Number(from.longitude)},${Number(from.latitude)};${Number(to.longitude)},${Number(to.latitude)}`;
    const url = new URL(`${baseUrl}/route/v1/driving/${coordinates}`);
    url.searchParams.set("overview", "false");
    url.searchParams.set("alternatives", "false");
    const startedAt = process.hrtime.bigint();

    let response: Response;
    try {
      response = await fetch(url, { signal: AbortSignal.timeout(this.timeoutMs), headers: { Accept: "application/json" } });
    } catch (error) {
      this.logExternalRequest(startedAt, undefined, "network_error");
      throw new RouteRequestError(`Route request failed: ${error instanceof Error ? error.message : String(error)}`);
    }
    if (!response.ok) {
      this.logExternalRequest(startedAt, response.status, "http_error");
      throw new RouteRequestError(`Route service returned HTTP ${response.status}`);
    }

    let payload: unknown;
    try {
      payload = await response.json() as unknown;
    } catch (error) {
      this.logExternalRequest(startedAt, response.status, "invalid_json");
      throw new RouteRequestError(`Route service returned invalid JSON: ${error instanceof Error ? error.message : String(error)}`);
    }

    if (typeof payload !== "object" || payload === null || Array.isArray(payload)) {
      this.logExternalRequest(startedAt, response.status, "invalid_route");
      throw new RouteRequestError("出発地と到着地の道路ルートが見つかりません。");
    }
    const routePayload = payload as Record<string, unknown>;
    const routes = Array.isArray(routePayload.routes) ? routePayload.routes : [];
    const route = routes[0] as Record<string, unknown> | undefined;
    const durationSeconds = Number(route?.duration);
    const distanceMeters = Number(route?.distance);
    if (routePayload.code !== "Ok" || !Number.isFinite(durationSeconds) || !Number.isFinite(distanceMeters) || durationSeconds < 0 || distanceMeters < 0) {
      this.logExternalRequest(startedAt, response.status, "invalid_route");
      throw new RouteRequestError("出発地と到着地の道路ルートが見つかりません。");
    }
    if (durationSeconds > MAX_ROUTE_DURATION_SECONDS) {
      this.logExternalRequest(startedAt, response.status, "invalid_route");
      throw new RouteRequestError("この車移動は7日予報の範囲を超えるため、到着時の天気を確認できません。近い都市間で試してください。");
    }

    this.logExternalRequest(startedAt, response.status, "ok");
    return { durationSeconds, distanceMeters };
  }

  private logExternalRequest(startedAt: bigint, status: number | undefined, outcome: string) {
    const durationMs = Number(process.hrtime.bigint() - startedAt) / 1_000_000;
    logStructured(outcome === "ok" ? "info" : "warn", {
      event: "external_request",
      request_id: currentRequestId(),
      service: "osrm_route",
      status,
      outcome,
      duration_ms: Math.round(durationMs * 100) / 100,
    });
  }
}
