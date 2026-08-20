import { useState } from "react";

import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import CircularProgress from "@mui/material/CircularProgress";
import Divider from "@mui/material/Divider";
import Drawer from "@mui/material/Drawer";
import IconButton from "@mui/material/IconButton";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";

import { getApiErrorMessage } from "../api/client";
import { searchCities } from "../api/cityRequests";
import { t } from "../i18n";
import type { CitySearchResult } from "../types/weather";
import CloseIcon from "./CloseIcon";

type CitySearchDrawerProps = {
  open: boolean;
  readOnly: boolean;
  submitting: boolean;
  onClose: () => void;
  onAdd: (city: CitySearchResult) => void;
};

export default function CitySearchDrawer({ open, readOnly, submitting, onClose, onAdd }: CitySearchDrawerProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<CitySearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSearch = async () => {
    if (!query.trim()) return;
    setLoading(true);
    setError(null);
    try {
      setResults(await searchCities(query));
    } catch (requestError) {
      setError(getApiErrorMessage(requestError, t("weather.errors.search")));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Drawer anchor="right" open={open} onClose={onClose}>
      <Box sx={{ width: { xs: "100vw", sm: 500 }, p: 3, backgroundColor: "#f5f7fb", minHeight: "100%" }}>
        <Stack spacing={2.25}>
          <Stack direction="row" justifyContent="space-between" alignItems="flex-start" spacing={1}>
            <Box><Typography variant="h6">{t("weather.search.title")}</Typography><Typography variant="body2" color="text.secondary">{t("weather.search.description")}</Typography></Box>
            <IconButton size="small" onClick={onClose} aria-label={t("actions.close")} title={t("actions.close")}><CloseIcon /></IconButton>
          </Stack>
          <Stack direction="row" spacing={1}>
            <TextField fullWidth size="small" label={t("weather.search.keyword")} value={query} onChange={(event) => setQuery(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") void handleSearch(); }} placeholder={t("weather.search.placeholder")} />
            <Button variant="contained" onClick={() => void handleSearch()} disabled={loading || !query.trim()}>{loading ? <CircularProgress size={20} color="inherit" /> : t("weather.search.submit")}</Button>
          </Stack>
          {readOnly && <Alert severity="info" variant="outlined">{t("weather.search.read_only")}</Alert>}
          {error && <Alert severity="error">{error}</Alert>}
          <Stack divider={<Divider flexItem />} spacing={0}>
            {results.length === 0 && !loading ? <Typography variant="body2" color="text.secondary" sx={{ py: 3 }}>{t("weather.search.empty")}</Typography> : results.map((city) => (
              <Stack key={`${city.external_id}-${city.latitude}`} direction="row" spacing={1.5} alignItems="center" justifyContent="space-between" sx={{ py: 1.75 }}>
                <Box sx={{ minWidth: 0 }}><Typography fontWeight={800}>{city.name}</Typography><Typography variant="body2" color="text.secondary" noWrap>{[city.admin1, city.country].filter(Boolean).join(" / ")}</Typography></Box>
                <Button size="small" variant="outlined" onClick={() => onAdd(city)} disabled={readOnly || submitting}>{submitting ? <CircularProgress size={18} /> : t("weather.search.add")}</Button>
              </Stack>
            ))}
          </Stack>
        </Stack>
      </Box>
    </Drawer>
  );
}
