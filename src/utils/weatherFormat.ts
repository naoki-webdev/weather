import type { WeatherSnapshot } from "../types/weather";

export function formatTemperature(value: number | null | undefined) {
  return value === null || value === undefined || Number.isNaN(value) ? "—" : `${value.toFixed(1)}°C`;
}

export function formatNumber(value: number | null | undefined, unit = "") {
  return value === null || value === undefined || Number.isNaN(value) ? "—" : `${value.toFixed(1)}${unit}`;
}

export function formatPercent(value: number | null | undefined) {
  return value === null || value === undefined || Number.isNaN(value) ? "—" : `${Math.round(value)}%`;
}

export function formatAqi(value: number | null | undefined) {
  return value === null || value === undefined || Number.isNaN(value) ? "—" : `AQI ${Math.round(value)}`;
}

export function formatDateTime(value: string | null | undefined, timeZone?: string) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  try {
    return date.toLocaleString("ja-JP", { timeZone, month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
  } catch {
    return date.toLocaleString("ja-JP", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
  }
}

export function formatTime(value: string | null | undefined, timeZone?: string) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  try {
    return date.toLocaleTimeString("ja-JP", { timeZone, hour: "2-digit", minute: "2-digit" });
  } catch {
    return date.toLocaleTimeString("ja-JP", { hour: "2-digit", minute: "2-digit" });
  }
}

export function formatDate(value: string | undefined) {
  return value ? new Date(`${value}T00:00:00`).toLocaleDateString("ja-JP", { weekday: "short", month: "numeric", day: "numeric" }) : "—";
}

export function dailyValue(values: number[] | undefined, index = 0) {
  const value = values?.[index];
  return value === undefined ? null : value;
}

export function weatherCodeLabel(code: number | null | undefined) {
  if (code === undefined || code === null) return "—";
  if (code === 0) return "快晴";
  if ([1, 2].includes(code)) return "晴れ時々くもり";
  if (code === 3) return "くもり";
  if ([45, 48].includes(code)) return "霧";
  if ([51, 53, 55, 56, 57].includes(code)) return "霧雨";
  if ([61, 63, 65, 66, 67, 80, 81, 82].includes(code)) return "雨";
  if ([71, 73, 75, 77, 85, 86].includes(code)) return "雪";
  if ([95, 96, 99].includes(code)) return "雷雨";
  return "天候データ";
}

export function latestProbability(weather: WeatherSnapshot | null) {
  return dailyValue(weather?.daily.precipitation_probability_max);
}
