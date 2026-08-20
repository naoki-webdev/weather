import { useCallback, useEffect, useRef, useState } from "react";

import { getApiErrorMessage } from "../api/client";
import { createCity, deleteCity, fetchCity, syncCity } from "../api/cityRequests";
import { t } from "../i18n";
import type { City, CitySearchResult } from "../types/weather";
import { isAbortError } from "./requestUtils";

type UseCityDetailOptions = {
  refreshCities: () => Promise<void>;
  onCityRemoved: (cityId: number) => void;
  onCityUpdated: (city: City) => void;
};

export function useCityDetail({ refreshCities, onCityRemoved, onCityUpdated }: UseCityDetailOptions) {
  const [selectedCity, setSelectedCity] = useState<City | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const detailRequestSequence = useRef(0);
  const detailRequestController = useRef<AbortController | null>(null);

  useEffect(() => () => detailRequestController.current?.abort(), []);

  const openCity = useCallback(async (id: number) => {
    detailRequestController.current?.abort();
    const controller = new AbortController();
    detailRequestController.current = controller;
    const requestSequence = ++detailRequestSequence.current;

    try {
      const city = await fetchCity(id, controller.signal);
      if (controller.signal.aborted || requestSequence !== detailRequestSequence.current) return;
      setSelectedCity(city);
      setDetailOpen(true);
      setError(null);
    } catch (requestError) {
      if (!controller.signal.aborted && !isAbortError(requestError) && requestSequence === detailRequestSequence.current) {
        setError(getApiErrorMessage(requestError, t("weather.errors.fetch_detail")));
      }
    }
  }, []);

  const addCity = useCallback(async (city: CitySearchResult) => {
    setSaving(true);
    setError(null);
    try {
      const created = await createCity(city);
      setSelectedCity(created);
      setSearchOpen(false);
      setDetailOpen(true);
      await refreshCities();
    } catch (requestError) {
      setError(getApiErrorMessage(requestError, t("weather.errors.create")));
    } finally {
      setSaving(false);
    }
  }, [refreshCities]);

  const refreshCity = useCallback(async () => {
    if (!selectedCity) return;
    setSaving(true);
    try {
      const updated = await syncCity(selectedCity.id);
      setSelectedCity(updated);
      onCityUpdated(updated);
      setError(null);
      await refreshCities();
    } catch (requestError) {
      setError(getApiErrorMessage(requestError, t("weather.errors.sync")));
    } finally {
      setSaving(false);
    }
  }, [onCityUpdated, refreshCities, selectedCity]);

  const removeCity = useCallback(async () => {
    if (!selectedCity) return;
    setSaving(true);
    try {
      await deleteCity(selectedCity.id);
      onCityRemoved(selectedCity.id);
      setDetailOpen(false);
      setSelectedCity(null);
      setError(null);
      await refreshCities();
    } catch (requestError) {
      setError(getApiErrorMessage(requestError, t("weather.errors.delete")));
    } finally {
      setSaving(false);
    }
  }, [onCityRemoved, refreshCities, selectedCity]);

  const mergeCity = useCallback((updated: City) => {
    setSelectedCity((current) => current?.id === updated.id ? { ...current, ...updated } : current);
  }, []);

  return {
    selectedCity,
    detailOpen,
    searchOpen,
    saving,
    error,
    openCity,
    addCity,
    refreshCity,
    removeCity,
    mergeCity,
    closeDetail: () => setDetailOpen(false),
    openSearch: () => setSearchOpen(true),
    closeSearch: () => setSearchOpen(false),
  };
}
