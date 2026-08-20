import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import Divider from "@mui/material/Divider";
import Drawer from "@mui/material/Drawer";
import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";

import { t } from "../i18n";
import type { City } from "../types/weather";
import { dailyValue, formatAqi, formatDate, formatDateTime, formatNumber, formatPercent, formatTemperature, weatherCodeLabel } from "../utils/weatherFormat";

type CityDetailDrawerProps = {
  open: boolean;
  city: City | null;
  readOnly: boolean;
  saving: boolean;
  onClose: () => void;
  onSync: () => void;
  onDelete: () => void;
};

function InfoRow({ label, value }: { label: string; value: string }) {
  return <Stack direction="row" spacing={2} justifyContent="space-between" sx={{ py: 0.8 }}><Typography variant="body2" color="text.secondary">{label}</Typography><Typography variant="body2" fontWeight={700} textAlign="right">{value}</Typography></Stack>;
}

function formatScoreDelta(value: number | null | undefined) {
  if (value === null || value === undefined) return "—";
  return `${value > 0 ? "+" : ""}${value.toFixed(1)}点`;
}

export default function CityDetailDrawer({ open, city, readOnly, saving, onClose, onSync, onDelete }: CityDetailDrawerProps) {
  const weather = city?.weather;
  const current = weather?.current;
  const daily = weather?.daily;
  const dates = daily?.time ?? [];
  const weakestComponent = city
    ? Object.entries(city.score_breakdown).sort(([, left], [, right]) => left - right)[0]
    : null;

  return (
    <Drawer anchor="right" open={open} onClose={onClose}>
      <Box sx={{ width: { xs: "100vw", sm: 540 }, p: 3, backgroundColor: "#f5f7fb", minHeight: "100%" }}>
        {!city ? <Typography>{t("weather.detail.empty")}</Typography> : <Stack spacing={2.25}>
          <Stack direction="row" justifyContent="space-between" alignItems="flex-start" spacing={2}><Box><Typography variant="h5" fontWeight={850}>{city.name}</Typography><Typography variant="body2" color="text.secondary">{[city.admin1, city.country].filter(Boolean).join(" / ")}</Typography></Box><Chip color={city.score >= 70 ? "success" : city.score >= 50 ? "warning" : "default"} label={`${city.score}点`} /></Stack>
          {!readOnly && <Stack direction="row" spacing={1}><Button variant="contained" onClick={onSync} disabled={saving}>{saving ? t("weather.detail.syncing") : t("weather.detail.sync")}</Button><Button variant="outlined" color="error" onClick={onDelete} disabled={saving}>{t("weather.detail.delete")}</Button></Stack>}
          {city.score_insight.primary_component && <Alert severity="success" variant="outlined">{t("weather.detail.score_insight", { metric: t(`weather.preference.${city.score_insight.primary_component}`), weight: city.score_insight.primary_weight ?? 0 })}</Alert>}
          {weakestComponent && city.score < 100 && <Alert severity="warning" variant="outlined">{t("weather.detail.score_reason", { metric: t(`weather.preference.${weakestComponent[0]}`), score: weakestComponent[1] })}</Alert>}
          <Paper variant="outlined" sx={{ p: 2, borderRadius: 3, background: "linear-gradient(135deg, rgba(12,102,228,0.08), rgba(101,84,192,0.08))" }}>
            <Typography variant="overline" color="text.secondary">{t("weather.detail.current_title")}</Typography>
            <Typography variant="h3" fontWeight={850}>{formatTemperature(current?.temperature)}</Typography>
            <Typography variant="body2" color="text.secondary">{weatherCodeLabel(current?.weather_code)} ・ {t("weather.detail.updated_at", { value: formatDateTime(weather?.fetched_at) })}</Typography>
          </Paper>
          <Box sx={{ display: "grid", gap: 1, gridTemplateColumns: { xs: "repeat(2, minmax(0, 1fr))", sm: "repeat(4, minmax(0, 1fr))" } }}>
            {[
              [t("weather.detail.humidity"), formatPercent(current?.humidity)],
              [t("weather.detail.rain"), formatNumber(current?.precipitation, " mm")],
              [t("weather.detail.wind"), formatNumber(current?.wind_speed, " km/h")],
              [t("weather.detail.air_quality"), formatAqi(current?.us_aqi)],
            ].map(([label, value]) => <Paper key={label} variant="outlined" sx={{ p: 1.5, borderRadius: 3 }}><Typography variant="caption" color="text.secondary">{label}</Typography><Typography fontWeight={800}>{value}</Typography></Paper>)}
          </Box>
          <Box><Typography variant="subtitle2" sx={{ mb: 1 }}>{t("weather.detail.breakdown")}</Typography><Stack spacing={1}>{Object.entries(city.score_breakdown).map(([key, value]) => <Stack key={key} direction="row" spacing={1} alignItems="center"><Typography variant="body2" sx={{ width: 82 }}>{t(`weather.preference.${key}`)}</Typography><Box sx={{ flex: 1, height: 8, borderRadius: 99, backgroundColor: "rgba(9,30,66,0.08)", overflow: "hidden" }}><Box sx={{ width: `${value}%`, height: "100%", backgroundColor: value >= 70 ? "#1f845a" : value >= 50 ? "#b65c02" : "#c9372c" }} /></Box><Typography variant="body2" fontWeight={800} sx={{ width: 32, textAlign: "right" }}>{value}</Typography></Stack>)}</Stack></Box>
          {city.history && <Paper variant="outlined" sx={{ p: 2, borderRadius: 3, backgroundColor: "rgba(255,255,255,0.75)" }}><Stack spacing={1.25}><Stack direction="row" justifyContent="space-between" alignItems="baseline"><Typography variant="subtitle2">{t("weather.detail.history_title", { days: city.history.period_days })}</Typography><Typography variant="caption" color="text.secondary">{t("weather.detail.history_samples", { count: city.history.snapshot_count })}</Typography></Stack><Stack direction="row" spacing={1.5} alignItems="baseline"><Typography variant="h4" fontWeight={850}>{city.history.average_score ?? "—"}</Typography><Typography variant="body2" color="text.secondary">{t("weather.detail.history_score_unit")}</Typography><Chip size="small" color={(city.history.score_delta ?? 0) >= 0 ? "success" : "warning"} label={t("weather.detail.history_delta", { value: formatScoreDelta(city.history.score_delta) })} /></Stack><Box sx={{ display: "grid", gap: 1, gridTemplateColumns: "repeat(3, minmax(0, 1fr))" }}><Paper variant="outlined" sx={{ p: 1, borderRadius: 2 }}><Typography variant="caption" color="text.secondary">{t("weather.detail.history_temperature")}</Typography><Typography fontWeight={800}>{formatTemperature(city.history.averages.temperature)}</Typography></Paper><Paper variant="outlined" sx={{ p: 1, borderRadius: 2 }}><Typography variant="caption" color="text.secondary">{t("weather.detail.history_humidity")}</Typography><Typography fontWeight={800}>{formatPercent(city.history.averages.humidity)}</Typography></Paper><Paper variant="outlined" sx={{ p: 1, borderRadius: 2 }}><Typography variant="caption" color="text.secondary">{t("weather.detail.history_aqi")}</Typography><Typography fontWeight={800}>{formatAqi(city.history.averages.us_aqi)}</Typography></Paper></Box></Stack></Paper>}
          <Divider />
          <Box><Typography variant="subtitle2" sx={{ mb: 1 }}>{t("weather.detail.forecast")}</Typography><Box sx={{ display: "grid", gap: 1, gridTemplateColumns: "repeat(7, minmax(74px, 1fr))", overflowX: "auto", pb: 0.5 }}>{dates.map((date, index) => <Paper key={date} variant="outlined" sx={{ p: 1, minWidth: 74, borderRadius: 2.5, textAlign: "center" }}><Typography variant="caption" color="text.secondary">{formatDate(date)}</Typography><Typography variant="body2" fontWeight={800} sx={{ mt: 0.5 }}>{formatTemperature(dailyValue(daily?.temperature_2m_max, index))}</Typography><Typography variant="caption" color="text.secondary">{formatTemperature(dailyValue(daily?.temperature_2m_min, index))}</Typography><Typography variant="caption" display="block" color="primary.main" sx={{ mt: 0.5 }}>{formatPercent(dailyValue(daily?.precipitation_probability_max, index))}</Typography></Paper>)}</Box></Box>
          <Divider />
          <InfoRow label={t("weather.detail.coordinates")} value={`${city.latitude.toFixed(4)}, ${city.longitude.toFixed(4)}`} />
          <InfoRow label={t("weather.detail.timezone")} value={city.timezone} />
          <InfoRow label={t("weather.detail.source")} value={city.source_name} />
        </Stack>}
      </Box>
    </Drawer>
  );
}
