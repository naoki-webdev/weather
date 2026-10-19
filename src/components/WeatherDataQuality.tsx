import { Typography } from "@mui/material";
import type { City } from "../types/weather";
import { formatDateTime } from "../utils/weatherFormat";

export function coverageLabel(city: City) {
  const enabled = Object.keys(city.score_weights).filter((key) => city.score_weights[key as keyof typeof city.score_weights] > 0);
  const available = enabled.filter((key) => city.score_breakdown[key as keyof typeof city.score_breakdown] !== null).length;
  const coverage = city.score_coverage ?? { available, total: enabled.length };
  return coverage.total + "項目中" + coverage.available + "項目で評価";
}

export default function WeatherDataQuality({ city }: { city: City }) {
  const weather = city.weather;
  if (!weather) return <Typography variant="caption">データ未取得</Typography>;
  const forecast = weather.forecast_fetched_at;
  const air = weather.air_quality_fetched_at;
  const stale = (value: string | null | undefined) => !value || Date.now() - new Date(value).getTime() > 2 * 3600000;
  return <Typography component="div" variant="caption" color={stale(forecast) || stale(air) ? "warning.main" : "text.secondary"}>
    <div>{coverageLabel(city)}</div>
    <div>天候：{formatDateTime(forecast)}{weather.forecast_sync_failed ? "（取得失敗・前回値）" : stale(forecast) ? "（更新待ち）" : ""}</div>
    <div>大気質：{formatDateTime(air)}{weather.air_quality_sync_failed ? "（取得失敗・前回値）" : stale(air) ? "（更新待ち）" : ""}</div>
  </Typography>;
}
