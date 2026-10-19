import { useEffect, useRef, useState } from "react";
import { Alert, Button, Stack, TextField, Typography } from "@mui/material";
import { API_BASE_URL, requestJson } from "../api/client";
import { formatDateTime, formatPercent, formatTemperature } from "../utils/weatherFormat";

type WindowResult = { timezone: string; windows: Array<{ at: string; temperature: number; precipitation_probability: number; wind_speed: number }> };
export default function WeatherWindows({ cityId }: { cityId: number }) {
  const [rain, setRain] = useState("20"), [temperature, setTemperature] = useState("25"), [wind, setWind] = useState("20");
  const [result, setResult] = useState<WindowResult | null>(null), [error, setError] = useState(""), [loading, setLoading] = useState(false);
  const controllerRef = useRef<AbortController | null>(null);
  useEffect(() => { setResult(null); setError(""); return () => controllerRef.current?.abort(); }, [cityId]);
  const search = async () => {
    const values = [Number(rain), Number(temperature), Number(wind)];
    if ([rain,temperature,wind].some((v) => v.trim() === "") || !values.every(Number.isFinite) || values[0] < 0 || values[0] > 100 || values[1] < -60 || values[1] > 60 || values[2] < 0 || values[2] > 200) { setError("条件の値を確認してください。"); return; }
    controllerRef.current?.abort();
    const controller = new AbortController(); controllerRef.current = controller;
    setLoading(true); setError(""); setResult(null);
    try {
      const query = new URLSearchParams({ rain,temperature,wind });
      const next = await requestJson<WindowResult>(API_BASE_URL + "/api/cities/" + cityId + "/windows?" + query, { signal: controller.signal });
      if (!controller.signal.aborted) setResult(next);
    } catch { if (!controller.signal.aborted) setError("時間帯の予報を取得できませんでした。"); }
    finally { if (!controller.signal.aborted) setLoading(false); }
  };
  return <Stack spacing={1} sx={{ mt: 2 }}>
    <Typography fontWeight={700}>条件に合う外出時間（今後24時間）</Typography>
    <TextField size="small" type="number" label="降水確率の上限（%）" value={rain} inputProps={{ min: 0,max: 100 }} onChange={(e) => setRain(e.target.value)} />
    <TextField size="small" type="number" label="気温の上限（℃）" value={temperature} inputProps={{ min: -60,max: 60 }} onChange={(e) => setTemperature(e.target.value)} />
    <TextField size="small" type="number" label="風速の上限（km/h）" value={wind} inputProps={{ min: 0,max: 200 }} onChange={(e) => setWind(e.target.value)} />
    <Button disabled={loading} onClick={() => void search()}>{loading ? "検索中…" : "外出できる時間を探す"}</Button>
    {error && <Alert severity="error">{error}</Alert>}
    {result && (result.windows.length ? result.windows.map((window) => <Typography key={window.at} variant="body2">{formatDateTime(window.at,result.timezone)}：{formatTemperature(window.temperature)} / 雨 {formatPercent(window.precipitation_probability)} / 風 {window.wind_speed}km/h</Typography>) : <Alert severity="info">条件に合う時間帯はありません。</Alert>)}
  </Stack>;
}
