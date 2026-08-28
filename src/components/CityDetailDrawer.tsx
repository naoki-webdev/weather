import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Divider from "@mui/material/Divider";
import Drawer from "@mui/material/Drawer";
import IconButton from "@mui/material/IconButton";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";

import { t } from "../i18n";
import type { City } from "../types/weather";
import { dailyValue, formatAqi, formatDate, formatDateTime, formatNumber, formatPercent, formatTemperature, weatherCodeLabel } from "../utils/weatherFormat";
import CloseIcon from "./CloseIcon";
import HelpTooltip from "./HelpTooltip";

type CityDetailDrawerProps = {
  open: boolean;
  city: City | null;
  readOnly: boolean;
  saving: boolean;
  onClose: () => void;
  onSync: () => void;
  onDelete: () => void;
};

type MetricItem = {
  label: string;
  value: string;
};

function InfoRow({ label, value }: { label: string; value: string }) {
  return <Stack direction="row" spacing={2} justifyContent="space-between" sx={{ py: 0.8 }}><Typography variant="body2" color="text.secondary">{label}</Typography><Typography variant="body2" fontWeight={700} textAlign="right">{value}</Typography></Stack>;
}

function MetricGrid({ items, mobileColumns = 2 }: { items: MetricItem[]; mobileColumns?: number }) {
  return (
    <Box sx={{ display: "grid", gridTemplateColumns: { xs: `repeat(${mobileColumns}, minmax(0, 1fr))`, sm: `repeat(${items.length}, minmax(0, 1fr))` }, borderTop: "1px solid", borderBottom: "1px solid", borderColor: "divider" }}>
      {items.map((item, index) => (
        <Box key={item.label} sx={{ p: 1.25, minWidth: 0, borderColor: "divider", borderTop: { xs: index >= mobileColumns ? "1px solid" : "none", sm: "none" }, borderLeft: { xs: index % mobileColumns === 0 ? "none" : "1px solid", sm: index === 0 ? "none" : "1px solid" } }}>
          <Typography variant="caption" color="text.secondary" noWrap>{item.label}</Typography>
          <Typography fontWeight={800} noWrap>{item.value}</Typography>
        </Box>
      ))}
    </Box>
  );
}

function formatScoreDelta(value: number | null | undefined) {
  if (value === null || value === undefined) return "—";
  return `${value > 0 ? "+" : ""}${value.toFixed(1)}点`;
}

function scoreColor(score: number) {
  if (score >= 70) return "success.main";
  if (score >= 50) return "warning.main";
  return "text.primary";
}

export default function CityDetailDrawer({ open, city, readOnly, saving, onClose, onSync, onDelete }: CityDetailDrawerProps) {
  const weather = city?.weather;
  const current = weather?.current;
  const daily = weather?.daily;
  const dates = daily?.time ?? [];
  const weakestComponent = city
    ? Object.entries(city.score_breakdown)
      .filter((entry): entry is [string, number] => entry[1] !== null)
      .sort(([, left], [, right]) => left - right)[0] ?? null
    : null;

  return (
    <Drawer anchor="right" open={open} onClose={onClose} ModalProps={{ "aria-labelledby": "weather-city-detail-title" }}>
      <Box sx={{ width: { xs: "100vw", sm: 540 }, p: { xs: 2, sm: 3 }, backgroundColor: "background.paper", minHeight: "100%" }}>
        {!city ? <Typography>{t("weather.detail.empty")}</Typography> : <Stack spacing={2.25}>
          <Stack direction="row" justifyContent="space-between" alignItems="flex-start" spacing={2}>
            <Box sx={{ minWidth: 0 }}>
              <Typography id="weather-city-detail-title" variant="h5" fontWeight={850}>{city.name}</Typography>
              <Typography variant="body2" color="text.secondary">{[city.admin1, city.country].filter(Boolean).join(" / ")}</Typography>
            </Box>
            <Stack direction="row" spacing={0.5} alignItems="center">
              <Typography variant="h6" fontWeight={850} color={scoreColor(city.score)}>{city.score}点</Typography>
              <IconButton size="small" onClick={onClose} aria-label={t("actions.close")} title={t("actions.close")}><CloseIcon /></IconButton>
            </Stack>
          </Stack>
          {!readOnly && <Stack direction="row" spacing={1}><Button variant="contained" onClick={onSync} aria-busy={saving} disabled={saving}>{saving ? t("weather.detail.syncing") : t("weather.detail.sync")}</Button><Button variant="outlined" color="error" onClick={onDelete} disabled={saving}>{t("weather.detail.delete")}</Button></Stack>}
          {(city.score_insight.primary_component || weakestComponent) && <Box>
            <Typography variant="subtitle2" sx={{ mb: 0.5 }}>{t("weather.detail.evaluation")}</Typography>
            <Stack spacing={0.25}>
              {city.score_insight.primary_component && <Stack direction="row" spacing={1} alignItems="center">
                <Typography variant="body2" color="text.secondary" sx={{ width: 42 }}>{t("weather.detail.focus")}</Typography>
                <Typography variant="body2" fontWeight={800}>{t(`weather.preference.${city.score_insight.primary_component}`)} ×{city.score_insight.primary_weight ?? 0}</Typography>
                <HelpTooltip title={t("weather.detail.focus_help")} label={t("weather.detail.focus_help_label")} />
              </Stack>}
              {weakestComponent && <Stack direction="row" spacing={1} alignItems="center">
                <Typography variant="body2" color="text.secondary" sx={{ width: 42 }}>{t("weather.detail.weakness")}</Typography>
                <Typography variant="body2" fontWeight={800}>{t(`weather.preference.${weakestComponent[0]}`)} {weakestComponent[1]}</Typography>
                <HelpTooltip title={t("weather.detail.weakness_help")} label={t("weather.detail.weakness_help_label")} />
              </Stack>}
            </Stack>
          </Box>}
          <Box sx={{ py: 1.5, borderTop: "1px solid", borderBottom: "1px solid", borderColor: "divider" }}>
            <Typography variant="subtitle2" color="text.secondary">{t("weather.detail.current_title")}</Typography>
            <Typography variant="h3" fontWeight={850} sx={{ mt: 0.25 }}>{formatTemperature(current?.temperature)}</Typography>
            <Typography variant="body2">{weatherCodeLabel(current?.weather_code)}</Typography>
            <Typography variant="caption" color="text.secondary">{t("weather.detail.updated_at", { value: formatDateTime(weather?.fetched_at) })}</Typography>
          </Box>
          <MetricGrid items={[
            { label: t("weather.detail.humidity"), value: formatPercent(current?.humidity) },
            { label: t("weather.detail.rain"), value: formatNumber(current?.precipitation, " mm") },
            { label: t("weather.detail.wind"), value: formatNumber(current?.wind_speed, " km/h") },
            { label: t("weather.detail.air_quality"), value: formatAqi(current?.us_aqi) },
          ]} />
          <Box>
            <Typography variant="subtitle2" sx={{ mb: 1 }}>{t("weather.detail.breakdown")}</Typography>
            <Stack spacing={1}>{Object.entries(city.score_breakdown).map(([key, value]) => <Stack key={key} direction="row" spacing={1} alignItems="center"><Typography variant="body2" sx={{ width: 82 }}>{t(`weather.preference.${key}`)}</Typography>{value === null ? <Typography variant="body2" color="text.secondary" sx={{ ml: "auto" }}>—</Typography> : <><Box sx={{ flex: 1, height: 8, borderRadius: 99, backgroundColor: "rgba(9,30,66,0.08)", overflow: "hidden" }}><Box sx={{ width: `${value}%`, height: "100%", backgroundColor: value >= 70 ? "#1f845a" : value >= 50 ? "#b65c02" : "#c9372c" }} /></Box><Typography variant="body2" fontWeight={800} sx={{ width: 32, textAlign: "right" }}>{value}</Typography></>}</Stack>)}</Stack>
          </Box>
          {city.history && <Box sx={{ pt: 1.75, borderTop: "1px solid", borderColor: "divider" }}>
            <Stack direction="row" justifyContent="space-between" alignItems="baseline" spacing={1} sx={{ mb: 1 }}>
              <Typography variant="subtitle2">{t("weather.detail.history_title", { days: city.history.period_days })}</Typography>
              <Typography variant="caption" color="text.secondary" noWrap>{t("weather.detail.history_samples", { count: city.history.snapshot_count })}</Typography>
            </Stack>
            <Stack direction="row" spacing={1} alignItems="baseline" sx={{ mb: 1.25 }}>
              <Typography variant="h4" fontWeight={850}>{city.history.average_score ?? "—"}</Typography>
              <Typography variant="body2" color="text.secondary">{t("weather.detail.history_score_unit")}</Typography>
              <Typography variant="body2" fontWeight={700} color={scoreColor(city.history.score_delta ?? 0)}>{t("weather.detail.history_delta", { value: formatScoreDelta(city.history.score_delta) })}</Typography>
            </Stack>
            <MetricGrid mobileColumns={3} items={[
              { label: t("weather.detail.history_temperature"), value: formatTemperature(city.history.averages.temperature) },
              { label: t("weather.detail.history_humidity"), value: formatPercent(city.history.averages.humidity) },
              { label: t("weather.detail.history_aqi"), value: formatAqi(city.history.averages.us_aqi) },
            ]} />
          </Box>}
          <Box sx={{ pt: 1.75, borderTop: "1px solid", borderColor: "divider" }}>
            <Typography variant="subtitle2" sx={{ mb: 1 }}>{t("weather.detail.forecast")}</Typography>
            <Box sx={{ display: "grid", gridTemplateColumns: "repeat(7, minmax(74px, 1fr))", overflowX: "auto", borderTop: "1px solid", borderBottom: "1px solid", borderColor: "divider" }}>
              {dates.map((date, index) => <Box key={date} sx={{ p: 1, minWidth: 74, textAlign: "center", borderLeft: index === 0 ? "none" : "1px solid", borderColor: "divider" }}><Typography variant="caption" color="text.secondary">{formatDate(date)}</Typography><Typography variant="body2" fontWeight={800} sx={{ mt: 0.5 }}>{formatTemperature(dailyValue(daily?.temperature_2m_max, index))}</Typography><Typography variant="caption" color="text.secondary">{formatTemperature(dailyValue(daily?.temperature_2m_min, index))}</Typography><Typography variant="caption" display="block" color="primary.main" sx={{ mt: 0.5 }}>{formatPercent(dailyValue(daily?.precipitation_probability_max, index))}</Typography></Box>)}
            </Box>
          </Box>
          <Divider />
          <InfoRow label={t("weather.detail.coordinates")} value={`${city.latitude.toFixed(4)}, ${city.longitude.toFixed(4)}`} />
          <InfoRow label={t("weather.detail.timezone")} value={city.timezone} />
          <InfoRow label={t("weather.detail.source")} value={city.source_name} />
        </Stack>}
      </Box>
    </Drawer>
  );
}
