import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { getApiErrorMessage } from "../api/client";
import { downloadCitiesCsv, fetchCities, updateCityFavorite } from "../api/cityRequests";
import { t } from "../i18n";
import type { City, CityListParams, CitySortKey, SortDirection } from "../types/weather";
import { isAbortError } from "./requestUtils";

const emptySummary = { recommended: 0, average_temperature: null as number | null, refreshed: 0 };
type CachedCityMetadata = { totalCount: number; summary: typeof emptySummary };
const CITY_METADATA_CACHE_LIMIT = 40;

function rememberCityMetadata(cache: Map<string, CachedCityMetadata>, key: string, value: CachedCityMetadata) {
  if (!cache.has(key) && cache.size >= CITY_METADATA_CACHE_LIMIT) {
    const oldestKey = cache.keys().next().value;
    if (oldestKey !== undefined) cache.delete(oldestKey);
  }

  cache.set(key, value);
}

export function useCitiesList() {
  const [cities, setCities] = useState<City[]>([]);
  const [keyword, setKeywordState] = useState("");
  const [debouncedKeyword, setDebouncedKeyword] = useState("");
  const [favoritesOnly, setFavoritesOnly] = useState(false);
  const [sort, setSortState] = useState<CitySortKey>("score");
  const [direction, setDirection] = useState<SortDirection>("desc");
  const [page, setPageState] = useState(1);
  const [perPage, setPerPageState] = useState(20);
  const [totalCount, setTotalCount] = useState(0);
  const [summary, setSummary] = useState(emptySummary);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [favoriteSavingIds, setFavoriteSavingIds] = useState<number[]>([]);
  const citiesRequestSequence = useRef(0);
  const citiesRequestController = useRef<AbortController | null>(null);
  const favoriteRequestSequences = useRef(new Map<number, number>());
  const favoriteRequestSequence = useRef(0);
  const metadataByFilters = useRef(new Map<string, CachedCityMetadata>());
  const metadataFiltersKey = JSON.stringify({ keyword: debouncedKeyword.trim().toLowerCase(), favoritesOnly });
  const metadataFiltersKeyRef = useRef(metadataFiltersKey);
  metadataFiltersKeyRef.current = metadataFiltersKey;

  const listParams = useMemo<CityListParams>(
    () => ({ keyword: debouncedKeyword, favorites_only: favoritesOnly, sort, direction, page, per_page: perPage }),
    [debouncedKeyword, direction, favoritesOnly, page, perPage, sort],
  );
  const listParamsRef = useRef(listParams);
  listParamsRef.current = listParams;

  const loadCities = useCallback(async (refreshMetadata = false) => {
    const currentListParams = listParamsRef.current;
    if (refreshMetadata) metadataByFilters.current.clear();
    const currentFiltersKey = metadataFiltersKeyRef.current;
    const cachedMetadata = metadataByFilters.current.get(currentFiltersKey) ?? null;
    const includeSummary = refreshMetadata || cachedMetadata === null;
    citiesRequestController.current?.abort();
    const controller = new AbortController();
    citiesRequestController.current = controller;
    const requestSequence = ++citiesRequestSequence.current;

    setLoading(true);
    setError(null);
    try {
      const response = await fetchCities({ ...currentListParams, include_summary: includeSummary }, controller.signal);
      if (requestSequence !== citiesRequestSequence.current) return;
      const responseMetadata = response.meta.total_count !== undefined && response.meta.summary !== undefined
        ? { totalCount: response.meta.total_count, summary: response.meta.summary }
        : cachedMetadata;
      if (!responseMetadata) throw new Error("City list metadata was not returned.");
      rememberCityMetadata(metadataByFilters.current, currentFiltersKey, responseMetadata);

      setCities(response.cities);
      setTotalCount(responseMetadata.totalCount);
      setSummary(responseMetadata.summary);
      const currentPage = currentListParams.page ?? 1;
      const currentPerPage = currentListParams.per_page ?? 20;
      const lastPage = Math.max(1, Math.ceil(responseMetadata.totalCount / currentPerPage));
      if (currentPage > lastPage) {
        setCities([]);
        setPageState(lastPage);
      }
    } catch (requestError) {
      if (controller.signal.aborted || isAbortError(requestError) || requestSequence !== citiesRequestSequence.current) return;
      setError(getApiErrorMessage(requestError, t("weather.errors.fetch")));
    } finally {
      if (requestSequence === citiesRequestSequence.current) setLoading(false);
    }
  }, [listParams]);

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedKeyword(keyword), 300);
    return () => window.clearTimeout(timer);
  }, [keyword]);

  const keywordSettled = keyword === debouncedKeyword;
  useEffect(() => {
    if (!keywordSettled) return;
    void loadCities();
    return () => {
      citiesRequestSequence.current += 1;
      citiesRequestController.current?.abort();
    };
  }, [keywordSettled, loadCities]);

  const replaceCity = useCallback((updated: City) => {
    setCities((current) => current.map((city) => city.id === updated.id ? updated : city));
  }, []);

  const toggleFavorite = useCallback(async (cityId: number, favorite: boolean) => {
    const requestSequence = ++favoriteRequestSequence.current;
    favoriteRequestSequences.current.set(cityId, requestSequence);
    setFavoriteSavingIds((current) => current.includes(cityId) ? current : [...current, cityId]);
    setError(null);
    try {
      const updated = await updateCityFavorite(cityId, favorite);
      return requestSequence === favoriteRequestSequences.current.get(cityId) ? updated : null;
    } catch (requestError) {
      if (requestSequence !== favoriteRequestSequences.current.get(cityId)) return null;
      setError(getApiErrorMessage(requestError, t("weather.errors.favorite")));
      return null;
    } finally {
      if (requestSequence === favoriteRequestSequences.current.get(cityId)) {
        favoriteRequestSequences.current.delete(cityId);
        setFavoriteSavingIds((current) => current.filter((id) => id !== cityId));
      }
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
    favoriteSavingIds,
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
