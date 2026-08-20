import type { ReactNode } from "react";

import Button from "@mui/material/Button";
import CircularProgress from "@mui/material/CircularProgress";
import Stack from "@mui/material/Stack";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import Typography from "@mui/material/Typography";

import { t } from "../i18n";
import type { City } from "../types/weather";
import { formatAqi, formatNumber, formatPercent, formatTemperature, latestProbability } from "../utils/weatherFormat";

type ComparisonTableProps = {
  cities: City[];
  leaderId: number | null;
  historyPeriodDays: number;
  loading: boolean;
  onRemove: (cityId: number) => void;
};

function formatDelta(value: number | null | undefined) {
  if (value === null || value === undefined) return "—";
  return `${value > 0 ? "+" : ""}${value.toFixed(1)}点`;
}

type ComparisonRow = {
  label: string;
  value: (city: City) => ReactNode;
};

export default function ComparisonTable({ cities, leaderId, historyPeriodDays, loading, onRemove }: ComparisonTableProps) {
  if (loading) {
    return <Stack direction="row" spacing={1} alignItems="center" justifyContent="center" sx={{ py: 3 }}><CircularProgress size={22} /><Typography variant="body2">{t("common.loading")}</Typography></Stack>;
  }

  if (cities.length === 0) return null;

  const rows = [
    { label: t("weather.comparison.score"), value: (city: City) => <Typography fontWeight={850}>{city.score}点</Typography> },
    { label: t("weather.comparison.temperature"), value: (city: City) => formatTemperature(city.weather?.current.temperature) },
    { label: t("weather.comparison.humidity"), value: (city: City) => formatPercent(city.weather?.current.humidity) },
    { label: t("weather.comparison.rain"), value: (city: City) => formatPercent(latestProbability(city.weather)) },
    { label: t("weather.comparison.air_quality"), value: (city: City) => formatAqi(city.weather?.current.us_aqi) },
    { label: t("weather.comparison.average_score_30d"), value: (city: City) => city.history ? `${city.history.average_score ?? "—"}点` : "—" },
    { label: t("weather.comparison.score_delta"), value: (city: City) => formatDelta(city.history?.score_delta) },
    { label: t("weather.comparison.average_temperature_30d"), value: (city: City) => formatTemperature(city.history?.averages.temperature) },
    { label: t("weather.comparison.average_aqi_30d"), value: (city: City) => formatNumber(city.history?.averages.us_aqi) },
  ] satisfies ComparisonRow[];

  return <>
    <TableContainer sx={{ maxWidth: "100%" }}>
      <Table size="small" sx={{ minWidth: 640 }}>
        <TableHead><TableRow><TableCell sx={{ fontWeight: 800 }}>{t("weather.comparison.metric")}</TableCell>{cities.map((city) => <TableCell key={city.id} align="right" sx={{ minWidth: 150 }}><Stack direction="row" spacing={0.5} justifyContent="flex-end" alignItems="center"><Typography fontWeight={800} noWrap>{city.name}</Typography>{city.id === leaderId && <Typography variant="caption" color="success.main" fontWeight={800}>{t("weather.comparison.leader")}</Typography>}</Stack><Button size="small" onClick={() => onRemove(city.id)}>{t("weather.comparison.remove")}</Button></TableCell>)}</TableRow></TableHead>
        <TableBody>{rows.map(({ label, value }) => <TableRow key={label}><TableCell component="th" scope="row" sx={{ color: "text.secondary", fontWeight: 700, whiteSpace: "nowrap" }}>{label}</TableCell>{cities.map((city) => <TableCell key={`${city.id}-${label}`} align="right">{value(city)}</TableCell>)}</TableRow>)}</TableBody>
      </Table>
    </TableContainer>
    <Typography variant="caption" color="text.secondary">{t("weather.comparison.history_hint", { days: historyPeriodDays })}</Typography>
  </>;
}
