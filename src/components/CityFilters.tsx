import { memo } from "react";

import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";

import { t } from "../i18n";

type CityFiltersProps = {
  keyword: string;
  favoritesOnly: boolean;
  totalCount: number;
  onKeywordChange: (value: string) => void;
  onFavoritesOnlyChange: (value: boolean) => void;
  onClear: () => void;
  onExport: () => void;
};

function CityFilters({ keyword, favoritesOnly, totalCount, onKeywordChange, onFavoritesOnlyChange, onClear, onExport }: CityFiltersProps) {
  return (
    <Stack spacing={1.25}>
      <Stack spacing={0.25}>
        <Typography variant="subtitle2">{t("weather.filters.title")}</Typography>
        <Typography variant="body2" color="text.secondary">{t("weather.filters.description")}</Typography>
      </Stack>
      <Box sx={{ display: "grid", gap: 1, gridTemplateColumns: { xs: "1fr", md: "minmax(0, 1fr) auto auto auto" }, alignItems: "center" }}>
        <TextField label={t("weather.filters.keyword")} value={keyword} onChange={(event) => onKeywordChange(event.target.value)} placeholder={t("weather.filters.keyword_placeholder")} size="small" />
        <Button variant={favoritesOnly ? "contained" : "outlined"} onClick={() => onFavoritesOnlyChange(!favoritesOnly)}>{t("weather.filters.favorites")}</Button>
        <Button variant="text" onClick={onClear}>{t("weather.filters.clear")}</Button>
        <Button variant="outlined" onClick={onExport}>{t("weather.filters.export")}</Button>
      </Box>
      <Typography variant="body2" color="text.secondary">{t("weather.filters.result_summary", { count: totalCount })}</Typography>
    </Stack>
  );
}

export default memo(CityFilters);
