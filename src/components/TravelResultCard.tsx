import Box from "@mui/material/Box";
import IconButton from "@mui/material/IconButton";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";

import { t } from "../i18n";
import type { TravelPlan } from "../types/weather";
import { formatDateTime, formatNumber, formatPercent, formatTemperature, weatherCodeLabel } from "../utils/weatherFormat";
import CloseIcon from "./CloseIcon";

type TravelResultCardProps = {
  plan: TravelPlan;
  onClose: () => void;
};

export function formatTravelDuration(minutes: number) {
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  if (hours === 0) return `${minutes}${t("weather.travel.minutes")}`;
  return `${hours}${t("weather.travel.hours")}${remainingMinutes > 0 ? `${remainingMinutes}${t("weather.travel.minutes")}` : ""}`;
}

function recommendationColor(code: TravelPlan["recommendation"]["code"]) {
  if (code === "umbrella") return "warning" as const;
  if (code === "clear") return "success" as const;
  if (code === "caution") return "warning" as const;
  return "default" as const;
}

export default function TravelResultCard({ plan, onClose }: TravelResultCardProps) {
  return (
    <Box component="section" sx={{ borderTop: "1px solid", borderBottom: "1px solid", borderColor: "divider", py: 1.5 }}>
      <Stack spacing={1.25}>
        <Stack direction={{ xs: "column", sm: "row" }} justifyContent="space-between" spacing={1}>
          <Box>
            <Typography variant="subtitle1" fontWeight={850}>{t("weather.travel.title")}</Typography>
            <Typography variant="body2" color="text.secondary">{plan.from.name} → {plan.to.name} ・ {t("weather.travel.mode")}</Typography>
          </Box>
          <Stack direction="row" spacing={1} alignItems="center">
            <Typography variant="body2" color={`${recommendationColor(plan.recommendation.code)}.main`} fontWeight={850}>{t(`weather.travel.recommendation.${plan.recommendation.code}`)}</Typography>
            <IconButton size="small" onClick={onClose} aria-label={t("actions.close")} title={t("actions.close")}><CloseIcon /></IconButton>
          </Stack>
        </Stack>
        <Box sx={{ display: "grid", gap: 0, gridTemplateColumns: { xs: "repeat(2, minmax(0, 1fr))", sm: "repeat(4, minmax(0, 1fr))" }, borderTop: "1px solid", borderBottom: "1px solid", borderColor: "divider" }}>
          <Box sx={{ p: 1.25 }}><Typography variant="caption" color="text.secondary">{t("weather.travel.duration")}</Typography><Typography fontWeight={800}>{formatTravelDuration(plan.duration_minutes)}</Typography></Box>
          <Box sx={{ p: 1.25, borderLeft: { xs: "1px solid", sm: "1px solid" }, borderTop: { xs: "1px solid", sm: "none" }, borderColor: "divider" }}><Typography variant="caption" color="text.secondary">{t("weather.travel.distance")}</Typography><Typography fontWeight={800}>{plan.distance_km}{t("weather.travel.kilometers")}</Typography></Box>
          <Box sx={{ p: 1.25, borderLeft: { sm: "1px solid" }, borderColor: "divider" }}><Typography variant="caption" color="text.secondary">{t("weather.travel.departure")}</Typography><Typography fontWeight={800}>{formatDateTime(plan.departure_at, plan.from.timezone)}</Typography></Box>
          <Box sx={{ p: 1.25, borderLeft: { xs: "1px solid", sm: "1px solid" }, borderTop: { xs: "1px solid", sm: "none" }, borderColor: "divider" }}><Typography variant="caption" color="text.secondary">{t("weather.travel.arrival")}</Typography><Typography fontWeight={800}>{formatDateTime(plan.arrival_at, plan.to.timezone)}</Typography></Box>
        </Box>
        {plan.arrival_weather && <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5} alignItems={{ xs: "flex-start", sm: "center" }}><Typography variant="body2" fontWeight={800}>{t("weather.travel.arrival_weather")}</Typography><Typography variant="body2">{formatTemperature(plan.arrival_weather.temperature)} ・ {weatherCodeLabel(plan.arrival_weather.weather_code)} ・ {t("weather.travel.rain_probability", { value: formatPercent(plan.arrival_weather.precipitation_probability) })} ・ {t("weather.travel.wind", { value: formatNumber(plan.arrival_weather.wind_speed, " km/h") })}</Typography></Stack>}
        <Typography variant="body2" color="text.secondary">{t(`weather.travel.recommendation_message.${plan.recommendation.code}`)}</Typography>
      </Stack>
    </Box>
  );
}
