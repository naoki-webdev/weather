import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

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

    let response: Response;
    try {
      response = await fetch(url, { signal: AbortSignal.timeout(this.timeoutMs), headers: { Accept: "application/json" } });
    } catch (error) {
      throw new RouteRequestError(`Route request failed: ${error instanceof Error ? error.message : String(error)}`);
    }
    if (!response.ok) throw new RouteRequestError(`Route service returned HTTP ${response.status}`);

    let payload: Record<string, unknown>;
    try {
      payload = await response.json() as Record<string, unknown>;
    } catch (error) {
      throw new RouteRequestError(`Route service returned invalid JSON: ${error instanceof Error ? error.message : String(error)}`);
    }

    const routes = Array.isArray(payload.routes) ? payload.routes : [];
    const route = routes[0] as Record<string, unknown> | undefined;
    const durationSeconds = Number(route?.duration);
    const distanceMeters = Number(route?.distance);
    if (payload.code !== "Ok" || !Number.isFinite(durationSeconds) || !Number.isFinite(distanceMeters)) {
      throw new RouteRequestError("出発地と到着地の道路ルートが見つかりません。");
    }
    if (durationSeconds > MAX_ROUTE_DURATION_SECONDS) {
      throw new RouteRequestError("この車移動は7日予報の範囲を超えるため、到着時の天気を確認できません。近い都市間で試してください。");
    }

    return { durationSeconds, distanceMeters };
  }
}
