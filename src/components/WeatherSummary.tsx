import { memo } from "react";

import Box from "@mui/material/Box";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";

import { t } from "../i18n";
import { formatTemperature } from "../utils/weatherFormat";
import HelpTooltip from "./HelpTooltip";

type WeatherSummaryProps = {
  total: number;
  recommended: number;
  averageTemperature: number | null;
  refreshed: number;
};

function WeatherSummary({ total, recommended, averageTemperature, refreshed }: WeatherSummaryProps) {
  const items = [
    { value: total, label: t("weather.summary.cities") },
    { value: recommended, label: t("weather.summary.recommended"), help: true },
    { value: formatTemperature(averageTemperature), label: t("weather.summary.average_temperature") },
    { value: `${refreshed} / ${total}`, label: t("weather.summary.refreshed") },
  ];

  return (
    <Box component="section" sx={{ py: { xs: 1, md: 1.25 }, borderBottom: "1px solid rgba(9,30,66,0.12)" }}>
      <Box sx={{ display: "grid", gridTemplateColumns: { xs: "repeat(2, minmax(0, 1fr))", md: "repeat(4, minmax(0, 1fr))" } }}>
        {items.map((item, index) => (
          <Stack key={item.label} spacing={0.15} sx={{ px: { xs: 1, md: 1.5 }, py: { xs: 0.6, md: 0.25 }, borderLeft: { md: index > 0 ? "1px solid rgba(23,73,112,0.12)" : "none" }, borderTop: { xs: index > 1 ? "1px solid rgba(23,73,112,0.12)" : "none", md: "none" } }}>
            <Stack direction="row" spacing={0.25} alignItems="center">
              <Typography variant="caption" color="text.secondary" fontWeight={700}>{item.label}</Typography>
              {item.help && <HelpTooltip title={t("weather.summary.recommended_help")} label={t("weather.summary.recommended_help_label")} />}
            </Stack>
            <Typography variant="h6" sx={{ fontWeight: 800, lineHeight: 1.15 }}>{item.value}</Typography>
          </Stack>
        ))}
      </Box>
    </Box>
  );
}

export default memo(WeatherSummary);
