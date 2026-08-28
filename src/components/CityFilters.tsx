import { memo } from "react";

import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import TextField from "@mui/material/TextField";

import { t } from "../i18n";

type CityFiltersProps = {
  keyword: string;
  favoritesOnly: boolean;
  onKeywordChange: (value: string) => void;
  onFavoritesOnlyChange: (value: boolean) => void;
  onClear: () => void;
  onExport: () => void;
};

function CityFilters({ keyword, favoritesOnly, onKeywordChange, onFavoritesOnlyChange, onClear, onExport }: CityFiltersProps) {
  const canClear = keyword.trim().length > 0 || favoritesOnly;

  return (
    <Box sx={{ display: "grid", gap: 1, gridTemplateColumns: { xs: "1fr", md: canClear ? "minmax(0, 1fr) auto auto auto" : "minmax(0, 1fr) auto auto" }, alignItems: "center" }}>
      <TextField label={t("weather.filters.keyword")} value={keyword} onChange={(event) => onKeywordChange(event.target.value)} size="small" />
      <Button variant={favoritesOnly ? "contained" : "outlined"} onClick={() => onFavoritesOnlyChange(!favoritesOnly)}>{t("weather.filters.favorites")}</Button>
      {canClear && <Button variant="text" onClick={onClear}>{t("weather.filters.clear")}</Button>}
      <Button variant="outlined" onClick={onExport}>{t("weather.filters.export")}</Button>
    </Box>
  );
}

export default memo(CityFilters);
