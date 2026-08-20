import { memo } from "react";

import Box from "@mui/material/Box";
import Checkbox from "@mui/material/Checkbox";
import IconButton from "@mui/material/IconButton";
import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
import TablePagination from "@mui/material/TablePagination";
import TableRow from "@mui/material/TableRow";
import TableSortLabel from "@mui/material/TableSortLabel";
import Typography from "@mui/material/Typography";

import { t } from "../i18n";
import type { City, CitySortKey, SortDirection } from "../types/weather";
import { formatAqi, formatDateTime, formatPercent, formatTemperature, latestProbability, weatherCodeLabel } from "../utils/weatherFormat";

type CityTableProps = {
  cities: City[];
  page: number;
  perPage: number;
  totalCount: number;
  sort: CitySortKey;
  direction: SortDirection;
  onSortChange: (sort: CitySortKey, direction: SortDirection) => void;
  onPageChange: (page: number) => void;
  onPerPageChange: (perPage: number) => void;
  onRowClick: (id: number) => void;
  selectedIds: number[];
  onToggleSelect: (id: number) => void;
  onToggleFavorite: (id: number, favorite: boolean) => void;
  favoriteSavingId: number | null;
  readOnly: boolean;
};

const columns: Array<{ key: CitySortKey; label: string; sortable: boolean }> = [
  { key: "name", label: "weather.table.city", sortable: true },
  { key: "temperature", label: "weather.table.temperature", sortable: true },
  { key: "updated_at", label: "weather.table.rain", sortable: false },
  { key: "updated_at", label: "weather.table.humidity", sortable: false },
  { key: "updated_at", label: "weather.table.air_quality", sortable: false },
  { key: "score", label: "weather.table.score", sortable: true },
  { key: "updated_at", label: "weather.table.updated", sortable: true },
];

function CityTable({ cities, page, perPage, totalCount, sort, direction, onSortChange, onPageChange, onPerPageChange, onRowClick, selectedIds, onToggleSelect, onToggleFavorite, favoriteSavingId, readOnly }: CityTableProps) {
  const handleSort = (key: CitySortKey) => onSortChange(key, sort === key && direction === "asc" ? "desc" : "asc");

  if (cities.length === 0) {
    return <Paper variant="outlined" sx={{ px: 4, py: 6, borderRadius: 0, textAlign: "center", boxShadow: "none" }}><Typography variant="h6">{t("weather.table.empty")}</Typography><Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>{t("weather.table.empty_hint")}</Typography></Paper>;
  }

  return (
    <Paper variant="outlined" sx={{ borderRadius: 0, overflow: "hidden", boxShadow: "none" }}>
      <Stack direction={{ xs: "column", md: "row" }} spacing={1.5} justifyContent="space-between" alignItems={{ xs: "flex-start", md: "center" }} sx={{ px: 2.25, py: 1.5, borderBottom: "1px solid rgba(9,30,66,0.08)", backgroundColor: "rgba(244,245,247,0.9)" }}>
        <Box><Typography variant="subtitle2">{t("weather.table.title")}</Typography><Typography variant="body2" color="text.secondary">{t("weather.table.description")}</Typography></Box>
        <Typography variant="caption" color="text.secondary" fontWeight={700}>{t("weather.table.visible_summary", { count: cities.length, total: totalCount })}</Typography>
      </Stack>
      <TableContainer>
        <Table size="small">
        <TableHead><TableRow sx={{ backgroundColor: "rgba(250,251,252,1)" }}><TableCell sx={{ py: 1.5 }}>{t("weather.table.select")}</TableCell><TableCell sx={{ py: 1.5, whiteSpace: "nowrap" }}>{t("weather.table.rank")}</TableCell>{columns.map((column, index) => <TableCell key={`${column.label}-${index}`} sx={{ py: 1.5, whiteSpace: "nowrap" }}><TableSortLabel active={column.sortable && sort === column.key} disabled={!column.sortable} direction={sort === column.key ? direction : "asc"} onClick={() => column.sortable && handleSort(column.key)}>{t(column.label)}</TableSortLabel></TableCell>)}<TableCell sx={{ py: 1.5, whiteSpace: "nowrap" }}>{t("weather.table.favorite")}</TableCell></TableRow></TableHead>
          <TableBody>{cities.map((city, index) => {
            const current = city.weather?.current;
            const probability = latestProbability(city.weather);
            const selected = selectedIds.includes(city.id);
            return <TableRow key={city.id} hover tabIndex={0} onClick={() => onRowClick(city.id)} onKeyDown={(event) => { if (event.key === "Enter") onRowClick(city.id); }} sx={{ cursor: "pointer" }}>
              <TableCell onClick={(event) => event.stopPropagation()}><Checkbox size="small" checked={selected} disabled={!selected && selectedIds.length >= 4} onChange={() => onToggleSelect(city.id)} inputProps={{ "aria-label": `${city.name}${t("weather.table.select_suffix")}` }} /></TableCell>
              <TableCell><Typography variant="body2" fontWeight={800}>{(page - 1) * perPage + index + 1}</Typography></TableCell>
              <TableCell><Stack spacing={0.25}><Typography fontWeight={800} noWrap sx={{ maxWidth: 220 }}>{city.name}</Typography><Typography variant="caption" color="text.secondary" noWrap>{[city.admin1, city.country].filter(Boolean).join(" / ")}</Typography></Stack></TableCell>
              <TableCell><Typography fontWeight={800}>{formatTemperature(current?.temperature)}</Typography><Typography variant="caption" color="text.secondary">{weatherCodeLabel(current?.weather_code)}</Typography></TableCell>
              <TableCell>{formatPercent(probability)}</TableCell>
              <TableCell>{formatPercent(current?.humidity)}</TableCell>
              <TableCell>{formatAqi(current?.us_aqi)}</TableCell>
              <TableCell><Typography fontWeight={800} color={city.score >= 70 ? "success.main" : city.score >= 50 ? "warning.dark" : "text.primary"}>{city.score}点</Typography></TableCell>
              <TableCell><Typography variant="body2">{formatDateTime(city.weather?.fetched_at)}</Typography></TableCell>
              <TableCell onClick={(event) => event.stopPropagation()}><IconButton size="small" aria-label={city.favorite ? `${city.name}${t("weather.table.unfavorite")}` : `${city.name}${t("weather.table.favorite_action")}`} onClick={() => onToggleFavorite(city.id, !city.favorite)} disabled={readOnly || favoriteSavingId === city.id} sx={{ color: city.favorite ? "#f2b01e" : "text.disabled", "&:hover": { color: "#d99400" } }}>{city.favorite ? "★" : "☆"}</IconButton></TableCell>
            </TableRow>;
          })}</TableBody>
        </Table>
      </TableContainer>
      <TablePagination component="div" count={totalCount} page={page - 1} onPageChange={(_, nextPage) => onPageChange(nextPage + 1)} rowsPerPage={perPage} onRowsPerPageChange={(event) => onPerPageChange(Number(event.target.value))} rowsPerPageOptions={[10, 20, 50]} />
    </Paper>
  );
}

export default memo(CityTable);
