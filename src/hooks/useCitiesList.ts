import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { getApiErrorMessage } from "../api/client";
import { downloadCitiesCsv, fetchCities, updateCityFavorite } from "../api/cityRequests";
import { t } from "../i18n";
import type { City, CityListParams, CitySortKey, SortDirection } from "../types/weather";
import { isAbortError } from "./requestUtils";

const emptySummary = { recommended: 0, average_temperature: null as number | null, refreshed: 0 };

export function useCitiesList() {
  const [cities, setCities] = useState<City[]>([]);
  const [keyword, setKeywordState] = useState("");
  const [favoritesOnly, setFavoritesOnly] = useState(false);
  const [sort, setSortState] = useState<CitySortKey>("score");
  const [direction, setDirection] = useState<SortDirection>("desc");
  const [page, setPageState] = useState(1);
  const [perPage, setPerPageState] = useState(20);
  const [totalCount, setTotalCount] = useState(0);
  const [summary, setSummary] = useState(emptySummary);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [favoriteSavingId, setFavoriteSavingId] = useState<number | null>(null);
  const citiesRequestSequence = useRef(0);
  const citiesRequestController = useRef<AbortController | null>(null);

  const listParams = useMemo<CityListParams>(
    () => ({ keyword, favorites_only: favoritesOnly, sort, direction, page, per_page: perPage }),
    [direction, favoritesOnly, keyword, page, perPage, sort],
  );

  const loadCities = useCallback(async () => {
    citiesRequestController.current?.abort();
    const controller = new AbortController();
    citiesRequestController.current = controller;
    const requestSequence = ++citiesRequestSequence.current;

    setLoading(true);
    setError(null);
    try {
      const response = await fetchCities(listParams, controller.signal);
      if (requestSequence !== citiesRequestSequence.current) return;
      setCities(response.cities);
      setTotalCount(response.meta.total_count);
      setSummary(response.meta.summary);
    } catch (requestError) {
      if (controller.signal.aborted || isAbortError(requestError) || requestSequence !== citiesRequestSequence.current) return;
      setError(getApiErrorMessage(requestError, t("weather.errors.fetch")));
    } finally {
      if (requestSequence === citiesRequestSequence.current) setLoading(false);
    }
  }, [listParams]);

  useEffect(() => {
    void loadCities();
    return () => citiesRequestController.current?.abort();
  }, [loadCities]);

  const replaceCity = useCallback((updated: City) => {
    setCities((current) => current.map((city) => city.id === updated.id ? updated : city));
  }, []);

  const toggleFavorite = useCallback(async (cityId: number, favorite: boolean) => {
    setFavoriteSavingId(cityId);
    setError(null);
    try {
      return await updateCityFavorite(cityId, favorite);
    } catch (requestError) {
      setError(getApiErrorMessage(requestError, t("weather.errors.favorite")));
      return null;
    } finally {
      setFavoriteSavingId(null);
    }
  }, []);

  const exportCsv = useCallback(async () => {
    try {
      const { blob, filename } = await downloadCitiesCsv(listParams);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (requestError) {
      setError(getApiErrorMessage(requestError, t("weather.errors.export")));
    }
  }, [listParams]);

  return {
    cities,
    keyword,
    favoritesOnly,
    sort,
    direction,
    page,
    perPage,
    totalCount,
    summary,
    loading,
    error,
    favoriteSavingId,
    listParams,
    loadCities,
    replaceCity,
    toggleFavorite,
    exportCsv,
    setKeyword: (value: string) => { setKeywordState(value); setPageState(1); },
    setFavoritesOnly: (value: boolean) => { setFavoritesOnly(value); setPageState(1); },
    setSort: (value: CitySortKey, nextDirection: SortDirection) => { setSortState(value); setDirection(nextDirection); setPageState(1); },
    setPage: setPageState,
    setPerPage: (value: number) => { setPerPageState(value); setPageState(1); },
    clearFilters: () => { setKeywordState(""); setFavoritesOnly(false); setPageState(1); },
  };
}
