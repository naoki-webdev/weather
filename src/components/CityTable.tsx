import WeatherDataQuality from "./WeatherDataQuality";
import { memo } from "react";

import useMediaQuery from "@mui/material/useMediaQuery";
import Button from "@mui/material/Button";
import MenuItem from "@mui/material/MenuItem";
import TextField from "@mui/material/TextField";
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
  favoriteSavingIds: number[];
  readOnly: boolean;
};

const columns: Array<{ id: string; label: string; sortKey?: CitySortKey }> = [
  { id: "city", label: "weather.table.city", sortKey: "name" },
  { id: "temperature", label: "weather.table.temperature", sortKey: "temperature" },
  { id: "rain", label: "weather.table.rain" },
  { id: "humidity", label: "weather.table.humidity" },
  { id: "air-quality", label: "weather.table.air_quality" },
  { id: "score", label: "weather.table.score", sortKey: "score" },
  { id: "updated", label: "weather.table.updated", sortKey: "updated_at" },
];

function CityTable({ cities, page, perPage, totalCount, sort, direction, onSortChange, onPageChange, onPerPageChange, onRowClick, selectedIds, onToggleSelect, onToggleFavorite, favoriteSavingIds, readOnly }: CityTableProps) {
  const compact = useMediaQuery("(max-width:599px)");
  const handleSort = (key: CitySortKey) => onSortChange(key, sort === key && direction === "asc" ? "desc" : "asc");

  if (cities.length === 0) {
    return <Paper variant="outlined" sx={{ px: 4, py: 6, borderRadius: 0, textAlign: "center", boxShadow: "none" }}><Typography variant="h6">{t("weather.table.empty")}</Typography><Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>{t("weather.table.empty_hint")}</Typography></Paper>;
  }

  if (compact) return <Stack spacing={1}>
    <Stack direction="row" spacing={1}><TextField select size="small" label="並び順" value={sort} onChange={(e) => onSortChange(e.target.value as CitySortKey, direction)}>{columns.filter((column) => column.sortKey).map((column) => <MenuItem key={column.id} value={column.sortKey}>{t(column.label)}</MenuItem>)}</TextField><Button onClick={() => onSortChange(sort, direction === "asc" ? "desc" : "asc")}>{direction === "asc" ? "昇順" : "降順"}</Button></Stack>
    {cities.map((city) => <Paper key={city.id} variant="outlined" sx={{ p: 1.5 }}>
      <Stack direction="row" alignItems="center" justifyContent="space-between"><Typography fontWeight={800}>{city.name}</Typography><Checkbox checked={selectedIds.includes(city.id)} disabled={!selectedIds.includes(city.id) && selectedIds.length >= 4} onChange={() => onToggleSelect(city.id)} inputProps={{ "aria-label": city.name + t("weather.table.select_suffix") }} /></Stack>
      <Typography>{formatTemperature(city.weather?.current.temperature)} / 降水確率 {formatPercent(latestProbability(city.weather))} / {city.score === null ? "未評価" : city.score + "点"}</Typography>
      <WeatherDataQuality city={city} />
      <Stack direction="row" spacing={1}><Button onClick={() => onRowClick(city.id)}>詳細を開く</Button><Button disabled={readOnly || favoriteSavingIds.includes(city.id)} onClick={() => onToggleFavorite(city.id, !city.favorite)}>{city.favorite ? "★ お気に入り解除" : "☆ お気に入り"}</Button></Stack>
    </Paper>)}
    <TablePagination component="div" count={totalCount} page={page - 1} onPageChange={(_, next) => onPageChange(next + 1)} rowsPerPage={perPage} onRowsPerPageChange={(e) => onPerPageChange(Number(e.target.value))} rowsPerPageOptions={[10,20,50]} />
  </Stack>;

  return (
    <Paper variant="outlined" sx={{ borderRadius: 0, overflow: "hidden", boxShadow: "none" }}>
      <Box sx={{ display: { xs: "flex", sm: "none" }, justifyContent: "flex-end", px: 2.25, py: 0.75, borderBottom: "1px solid rgba(9,30,66,0.08)" }}>
        <Typography variant="caption" color="text.secondary">{t("weather.table.scroll_hint")}</Typography>
      </Box>
      <TableContainer sx={{ overflowX: "auto" }} tabIndex={0} aria-label={t("weather.table.title")}>
        <Table size="small" sx={{ minWidth: 940 }}>
        <TableHead><TableRow sx={{ backgroundColor: "rgba(250,251,252,1)" }}><TableCell sx={{ py: 1.5 }}>{t("weather.table.select")}</TableCell><TableCell sx={{ py: 1.5, whiteSpace: "nowrap" }}>{t("weather.table.rank")}</TableCell>{columns.map((column) => <TableCell key={column.id} sx={{ py: 1.5, whiteSpace: "nowrap" }}><TableSortLabel active={column.sortKey !== undefined && sort === column.sortKey} disabled={column.sortKey === undefined} direction={column.sortKey === sort ? direction : "asc"} onClick={() => column.sortKey && handleSort(column.sortKey)}>{t(column.label)}</TableSortLabel></TableCell>)}<TableCell sx={{ py: 1.5, whiteSpace: "nowrap" }}>{t("weather.table.favorite")}</TableCell></TableRow></TableHead>
          <TableBody>{cities.map((city, index) => {
            const current = city.weather?.current;
            const probability = latestProbability(city.weather);
            const selected = selectedIds.includes(city.id);
            return <TableRow key={city.id} hover tabIndex={0} aria-label={t("weather.table.open_detail", { city: city.name })} onClick={() => onRowClick(city.id)} onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); onRowClick(city.id); } }} sx={{ cursor: "pointer" }}>
              <TableCell onClick={(event) => event.stopPropagation()} onKeyDown={(event) => event.stopPropagation()}><Checkbox size="small" checked={selected} disabled={!selected && selectedIds.length >= 4} onChange={() => onToggleSelect(city.id)} inputProps={{ "aria-label": `${city.name}${t("weather.table.select_suffix")}` }} /></TableCell>
              <TableCell><Typography variant="body2" fontWeight={800}>{(page - 1) * perPage + index + 1}</Typography></TableCell>
              <TableCell><Stack spacing={0.25}><Typography fontWeight={800} noWrap sx={{ maxWidth: 220 }}>{city.name}</Typography><Typography variant="caption" color="text.secondary" noWrap>{[city.admin1, city.country].filter(Boolean).join(" / ")}</Typography></Stack></TableCell>
              <TableCell><Typography fontWeight={800}>{formatTemperature(current?.temperature)}</Typography><Typography variant="caption" color="text.secondary">{weatherCodeLabel(current?.weather_code)}</Typography></TableCell>
              <TableCell>{formatPercent(probability)}</TableCell>
              <TableCell>{formatPercent(current?.humidity)}</TableCell>
              <TableCell>{formatAqi(current?.us_aqi)}</TableCell>
              <TableCell><Typography fontWeight={800} color={city.score === null ? "text.secondary" : city.score >= 70 ? "success.main" : city.score >= 50 ? "warning.dark" : "text.primary"}>{city.score === null ? "—" : `${city.score}点`}</Typography></TableCell>
              <TableCell><Typography variant="body2">{formatDateTime(city.weather?.fetched_at)}</Typography><WeatherDataQuality city={city} /></TableCell>
              <TableCell onClick={(event) => event.stopPropagation()} onKeyDown={(event) => event.stopPropagation()}><IconButton size="small" aria-label={city.favorite ? `${city.name}${t("weather.table.unfavorite")}` : `${city.name}${t("weather.table.favorite_action")}`} onClick={() => onToggleFavorite(city.id, !city.favorite)} disabled={readOnly || favoriteSavingIds.includes(city.id)} sx={{ color: city.favorite ? "#f2b01e" : "text.disabled", "&:hover": { color: city.favorite ? "#d99400" : "text.secondary" }, "&&.Mui-disabled": { color: city.favorite ? "#f2b01e" : "text.disabled" } }}>{city.favorite ? "★" : "☆"}</IconButton></TableCell>
            </TableRow>;
          })}</TableBody>
        </Table>
      </TableContainer>
      <TablePagination component="div" count={totalCount} page={page - 1} onPageChange={(_, nextPage) => onPageChange(nextPage + 1)} rowsPerPage={perPage} onRowsPerPageChange={(event) => onPerPageChange(Number(event.target.value))} rowsPerPageOptions={[10, 20, 50]} />
    </Paper>
  );
}

export default memo(CityTable);
