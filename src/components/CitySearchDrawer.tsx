import { useEffect, useRef, useState } from "react";

import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import CircularProgress from "@mui/material/CircularProgress";
import Divider from "@mui/material/Divider";
import Drawer from "@mui/material/Drawer";
import IconButton from "@mui/material/IconButton";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Tooltip from "@mui/material/Tooltip";
import Typography from "@mui/material/Typography";

import { getApiErrorMessage } from "../api/client";
import { searchCities } from "../api/cityRequests";
import { isAbortError } from "../hooks/requestUtils";
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
  const searchRequestSequence = useRef(0);
  const searchRequestController = useRef<AbortController | null>(null);

  useEffect(() => () => {
    searchRequestController.current?.abort();
  }, []);

  useEffect(() => {
    if (open) return;
    searchRequestController.current?.abort();
    searchRequestController.current = null;
    searchRequestSequence.current += 1;
    setLoading(false);
    setError(null);
    setResults([]);
  }, [open]);

  const handleSearch = async () => {
    const normalizedQuery = query.trim();
    if (!normalizedQuery || loading) return;

    searchRequestController.current?.abort();
    const controller = new AbortController();
    searchRequestController.current = controller;
    const requestSequence = ++searchRequestSequence.current;

    setLoading(true);
    setError(null);
    try {
      const nextResults = await searchCities(normalizedQuery, controller.signal);
      if (requestSequence !== searchRequestSequence.current) return;
      setResults(nextResults);
    } catch (requestError) {
      if (controller.signal.aborted || isAbortError(requestError) || requestSequence !== searchRequestSequence.current) return;
      setError(getApiErrorMessage(requestError, t("weather.errors.search")));
    } finally {
      if (requestSequence === searchRequestSequence.current) setLoading(false);
    }
  };

  return (
    <Drawer anchor="right" open={open} onClose={onClose} ModalProps={{ "aria-labelledby": "weather-city-search-title" }}>
      <Box sx={{ width: { xs: "100vw", sm: 500 }, p: { xs: 2, sm: 3 }, backgroundColor: "background.paper", minHeight: "100%" }}>
        <Stack spacing={2.25}>
          <Stack direction="row" justifyContent="space-between" alignItems="flex-start" spacing={1}>
            <Typography id="weather-city-search-title" variant="h6">{t("weather.search.title")}</Typography>
            <IconButton size="small" onClick={onClose} aria-label={t("actions.close")} title={t("actions.close")}><CloseIcon /></IconButton>
          </Stack>
          <Stack direction="row" spacing={1}>
            <TextField fullWidth size="small" label={t("weather.search.keyword")} value={query} onChange={(event) => setQuery(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") void handleSearch(); }} placeholder={t("weather.search.placeholder")} />
            <Button variant="contained" onClick={() => void handleSearch()} disabled={loading || !query.trim()} aria-busy={loading} aria-label={loading ? t("common.loading_status") : t("weather.search.submit")}>{loading ? <CircularProgress size={20} color="inherit" /> : t("weather.search.submit")}</Button>
          </Stack>
          {error && <Alert severity="error" role="alert" aria-live="assertive">{error}</Alert>}
          {(loading || results.length > 0) && <Box role="status" aria-live="polite" aria-atomic="true" sx={{ position: "absolute", width: 1, height: 1, p: 0, m: -1, overflow: "hidden", clip: "rect(0 0 0 0)", whiteSpace: "nowrap", border: 0 }}>{loading ? t("common.loading_status") : t("weather.search.result_count", { count: results.length })}</Box>}
          <Stack divider={<Divider flexItem />} spacing={0}>
            {results.map((city) => (
              <Stack key={`${city.external_id}-${city.latitude}`} direction="row" spacing={1.5} alignItems="center" justifyContent="space-between" sx={{ py: 1.75 }}>
                <Box sx={{ minWidth: 0 }}><Typography fontWeight={800}>{city.name}</Typography><Typography variant="body2" color="text.secondary" noWrap>{[city.admin1, city.country].filter(Boolean).join(" / ")}</Typography></Box>
                <Tooltip title={readOnly ? t("weather.search.read_only") : ""} arrow>
                  <span><Button size="small" variant="outlined" onClick={() => onAdd(city)} disabled={readOnly || submitting}>{submitting ? <CircularProgress size={18} /> : t("weather.search.add")}</Button></span>
                </Tooltip>
              </Stack>
            ))}
          </Stack>
        </Stack>
      </Box>
    </Drawer>
  );
}
