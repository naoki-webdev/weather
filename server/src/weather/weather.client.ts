import { Injectable, Optional } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import type { City } from "@prisma/client";
import { createHash } from "node:crypto";

import { currentRequestId } from "../observability/request-context";
import { logStructured } from "../observability/structured-log";

export class OpenMeteoRequestError extends Error {}
export class ForecastOutOfRangeError extends Error {}

type CacheEntry = { expiresAt: number; value: unknown };
const MAX_CACHE_ENTRIES = 1_000;

@Injectable()
export class WeatherClient {
  private readonly cache = new Map<string, CacheEntry>();
  private readonly inFlight = new Map<string, Promise<unknown>>();
  private readonly timeoutMs = 10_000;
  private readonly geocodingEndpoint: string;
  private readonly forecastEndpoint: string;
  private readonly airQualityEndpoint: string;

  constructor(@Optional() private readonly config?: ConfigService) {
    this.geocodingEndpoint = this.config?.get<string>("OPEN_METEO_GEOCODING_ENDPOINT") ?? "https://geocoding-api.open-meteo.com/v1/search";
    this.forecastEndpoint = this.config?.get<string>("OPEN_METEO_FORECAST_ENDPOINT") ?? "https://api.open-meteo.com/v1/forecast";
    this.airQualityEndpoint = this.config?.get<string>("OPEN_METEO_AIR_QUALITY_ENDPOINT") ?? "https://air-quality-api.open-meteo.com/v1/air-quality";
  }

  async geocode(query: string) {
    const normalized = query.trim();
    if (!normalized) return [];

    const key = `geocode:${createHash("sha256").update(normalized.toLowerCase()).digest("hex")}`;
    const payload = await this.cached(key, 60 * 60_000, () => this.getJson(this.geocodingEndpoint, {
      name: normalized,
      count: 10,
      language: "ja",
      format: "json",
    }, "open_meteo_geocoding"));

    return Array.isArray(payload.results)
      ? payload.results.flatMap((result: Record<string, unknown>) => {
        if (!result || typeof result !== "object") return [];
        const latitude = Number(result.latitude);
        const longitude = Number(result.longitude);
        if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return [];

        return [{
          external_id: String(result.id ?? ""),
          name: String(result.name ?? ""),
          country: String(result.country ?? ""),
          country_code: String(result.country_code ?? ""),
          admin1: String(result.admin1 ?? ""),
          latitude,
          longitude,
          timezone: String(result.timezone ?? ""),
          source_name: "Open-Meteo",
        }];
      })
      : [];
  }

  async weatherFor(city: Pick<City, "externalId" | "latitude" | "longitude">) {
    const coordinates = `${city.externalId}/${city.latitude}/${city.longitude}`;
    const [forecast, airQuality] = await Promise.all([
      this.cached(`forecast:${coordinates}`, 15 * 60_000, () => this.getJson(this.forecastEndpoint, {
        latitude: Number(city.latitude),
        longitude: Number(city.longitude),
        current: "temperature_2m,relative_humidity_2m,precipitation,weather_code,wind_speed_10m",
        daily: "weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum,precipitation_probability_max",
        forecast_days: 7,
        timezone: "auto",
      }, "open_meteo_forecast")),
      this.cached(`air-quality:${coordinates}`, 15 * 60_000, () => this.getJson(this.airQualityEndpoint, {
        latitude: Number(city.latitude),
        longitude: Number(city.longitude),
        current: "us_aqi,pm2_5,pm10",
        timezone: "auto",
      }, "open_meteo_air_quality")),
    ]);

    return { forecast, airQuality };
  }

  async hourlyWeatherFor(city: Pick<City, "externalId" | "latitude" | "longitude">, targetAt: Date) {
    const coordinates = `${city.externalId}/${city.latitude}/${city.longitude}`;
    const forecast = await this.cached(`hourly-forecast:${coordinates}:${targetAt.toISOString().slice(0, 10)}`, 15 * 60_000, () => this.getJson(this.forecastEndpoint, {
      latitude: Number(city.latitude),
      longitude: Number(city.longitude),
      hourly: "temperature_2m,precipitation_probability,precipitation,wind_speed_10m,weather_code",
      forecast_days: 7,
      timezone: "UTC",
    }, "open_meteo_hourly_forecast"));
    const hourly = forecast.hourly as Record<string, unknown> | undefined;
    const times = Array.isArray(hourly?.time) ? hourly.time.map(String) : [];
    if (times.length === 0) return null;

    const targetTimestamp = targetAt.getTime();
    const timestamps = times.map((time) => this.utcTimestamp(time));
    const firstTimestamp = timestamps[0];
    const lastTimestamp = timestamps[timestamps.length - 1];
    if (!Number.isFinite(targetTimestamp) || !Number.isFinite(firstTimestamp) || !Number.isFinite(lastTimestamp)) {
      throw new OpenMeteoRequestError("Open-Meteo returned an invalid hourly forecast.");
    }
    if (targetTimestamp < firstTimestamp || targetTimestamp > lastTimestamp) {
      throw new ForecastOutOfRangeError("到着予定時刻が予報対象期間外です。7日以内の到着予定を指定してください。");
    }

    const index = times.reduce((closest, time, current) => {
      const closestDistance = Math.abs(timestamps[closest] - targetTimestamp);
      const currentDistance = Math.abs(timestamps[current] - targetTimestamp);
      return currentDistance < closestDistance ? current : closest;
    }, 0);

    return {
      time: times[index],
      temperature: this.numberOrNull(hourly?.temperature_2m, index),
      precipitation_probability: this.numberOrNull(hourly?.precipitation_probability, index),
      precipitation: this.numberOrNull(hourly?.precipitation, index),
      wind_speed: this.numberOrNull(hourly?.wind_speed_10m, index),
      weather_code: this.numberOrNull(hourly?.weather_code, index),
    };
  }

  private async cached<T>(key: string, ttlMs: number, fetcher: () => Promise<T>): Promise<T> {
    const cached = this.cache.get(key);
    const now = Date.now();
    if (cached && cached.expiresAt > now) {
      // Map preserves insertion order, so reinsert hits to keep this cache LRU-like.
      this.cache.delete(key);
      this.cache.set(key, cached);
      return cached.value as T;
    }
    if (cached) this.cache.delete(key);

    const existingRequest = this.inFlight.get(key);
    if (existingRequest) return existingRequest as Promise<T>;

    const request = Promise.resolve().then(fetcher);
    this.inFlight.set(key, request);
    try {
      const value = await request;
      this.pruneExpired(Date.now());
      if (this.cache.size >= MAX_CACHE_ENTRIES) {
        const oldestKey = this.cache.keys().next().value;
        if (typeof oldestKey === "string") this.cache.delete(oldestKey);
      }
      this.cache.set(key, { expiresAt: Date.now() + ttlMs, value });
      return value;
    } finally {
      if (this.inFlight.get(key) === request) this.inFlight.delete(key);
    }
  }

  private pruneExpired(now: number) {
    for (const [key, entry] of this.cache) {
      if (entry.expiresAt <= now) this.cache.delete(key);
    }
  }

  private async getJson(endpoint: string, params: Record<string, string | number>, service: string) {
    const url = new URL(endpoint);
    Object.entries(params).forEach(([key, value]) => url.searchParams.set(key, String(value)));
    const startedAt = process.hrtime.bigint();

    let response: Response;
    try {
      response = await fetch(url, { signal: AbortSignal.timeout(this.timeoutMs), headers: { Accept: "application/json" } });
    } catch (error) {
      this.logExternalRequest(service, startedAt, undefined, "network_error");
      throw new OpenMeteoRequestError(`Open-Meteo request failed: ${error instanceof Error ? error.message : String(error)}`);
    }
    if (!response.ok) {
      this.logExternalRequest(service, startedAt, response.status, "http_error");
      throw new OpenMeteoRequestError(`Open-Meteo returned HTTP ${response.status}`);
    }

    try {
      const payload: unknown = await response.json();
      if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
        throw new Error("response was not an object");
      }
      this.logExternalRequest(service, startedAt, response.status, "ok");
      return payload as Record<string, unknown>;
    } catch (error) {
      this.logExternalRequest(service, startedAt, response.status, "invalid_json");
      throw new OpenMeteoRequestError(`Open-Meteo returned invalid JSON: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  private logExternalRequest(service: string, startedAt: bigint, status: number | undefined, outcome: string) {
    const durationMs = Number(process.hrtime.bigint() - startedAt) / 1_000_000;
    logStructured(outcome === "ok" ? "info" : "warn", {
      event: "external_request",
      request_id: currentRequestId(),
      service,
      status,
      outcome,
      duration_ms: Math.round(durationMs * 100) / 100,
    });
  }

  private numberOrNull(values: unknown, index: number) {
    if (!Array.isArray(values) || values[index] === null || values[index] === undefined) return null;
    const value = Number(values[index]);
    return Number.isFinite(value) ? value : null;
  }

  private utcTimestamp(time: string) {
    const utcTime = /[zZ]|[+-]\d{2}:?\d{2}$/.test(time) ? time : `${time}Z`;
    return new Date(utcTime).getTime();
  }
}
