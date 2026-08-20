import { memo } from "react";

import Box from "@mui/material/Box";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";

import { t } from "../i18n";
import { formatTemperature } from "../utils/weatherFormat";

type WeatherSummaryProps = {
  total: number;
  recommended: number;
  averageTemperature: number | null;
  refreshed: number;
};

function WeatherSummary({ total, recommended, averageTemperature, refreshed }: WeatherSummaryProps) {
  const items = [
    { value: total, label: t("weather.summary.cities"), caption: t("weather.summary.cities_caption") },
    { value: recommended, label: t("weather.summary.recommended"), caption: t("weather.summary.recommended_caption") },
    { value: formatTemperature(averageTemperature), label: t("weather.summary.average_temperature"), caption: t("weather.summary.average_temperature_caption") },
    { value: refreshed, label: t("weather.summary.refreshed"), caption: t("weather.summary.refreshed_caption") },
  ];

  return (
    <Box component="section" sx={{ py: { xs: 1, md: 1.25 }, borderBottom: "1px solid rgba(9,30,66,0.12)" }}>
      <Box sx={{ display: "grid", gridTemplateColumns: { xs: "repeat(2, minmax(0, 1fr))", md: "repeat(4, minmax(0, 1fr))" } }}>
        {items.map((item, index) => (
          <Stack key={item.label} spacing={0.15} sx={{ px: { xs: 1, md: 1.5 }, py: { xs: 0.6, md: 0.25 }, borderLeft: { md: index > 0 ? "1px solid rgba(23,73,112,0.12)" : "none" }, borderTop: { xs: index > 1 ? "1px solid rgba(23,73,112,0.12)" : "none", md: "none" } }}>
            <Typography variant="caption" color="text.secondary" fontWeight={700}>{item.label}</Typography>
            <Typography variant="h6" sx={{ fontWeight: 800, lineHeight: 1.15 }}>{item.value}</Typography>
            <Typography variant="caption" color="text.secondary" noWrap>{item.caption}</Typography>
          </Stack>
        ))}
      </Box>
    </Box>
  );
}

export default memo(WeatherSummary);
