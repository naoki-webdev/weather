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

  useEffect(() => () => {
    detailRequestController.current?.abort();
    detailRequestSequence.current += 1;
  }, []);

  const openCity = useCallback(async (id: number) => {
    detailRequestController.current?.abort();
    setSaving(false);
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
    detailRequestController.current?.abort();
    detailRequestController.current = null;
    const requestSequence = ++detailRequestSequence.current;
    setSaving(true);
    setError(null);
    try {
      const created = await createCity(city);
      if (requestSequence === detailRequestSequence.current) {
        setSelectedCity(created);
        setSearchOpen(false);
        setDetailOpen(true);
      }
      await refreshCities();
    } catch (requestError) {
      if (requestSequence === detailRequestSequence.current) {
        setError(getApiErrorMessage(requestError, t("weather.errors.create")));
      }
    } finally {
      if (requestSequence === detailRequestSequence.current) setSaving(false);
    }
  }, [refreshCities]);

  const refreshCity = useCallback(async () => {
    if (!selectedCity) return;
    detailRequestController.current?.abort();
    const controller = new AbortController();
    detailRequestController.current = controller;
    const requestSequence = ++detailRequestSequence.current;
    const cityId = selectedCity.id;
    setSaving(true);
    try {
      const updated = await syncCity(cityId, controller.signal);
      if (controller.signal.aborted || requestSequence !== detailRequestSequence.current) return;
      setSelectedCity(updated);
      onCityUpdated(updated);
      setError(null);
      await refreshCities();
    } catch (requestError) {
      if (!controller.signal.aborted && !isAbortError(requestError) && requestSequence === detailRequestSequence.current) {
        setError(getApiErrorMessage(requestError, t("weather.errors.sync")));
      }
    } finally {
      if (requestSequence === detailRequestSequence.current) setSaving(false);
    }
  }, [onCityUpdated, refreshCities, selectedCity]);

  const removeCity = useCallback(async () => {
    if (!selectedCity) return;
    const cityId = selectedCity.id;
    const requestSequence = ++detailRequestSequence.current;
    detailRequestController.current?.abort();
    detailRequestController.current = null;
    setSaving(true);
    try {
      await deleteCity(cityId);
      onCityRemoved(cityId);
      if (requestSequence === detailRequestSequence.current) {
        setDetailOpen(false);
        setSelectedCity(null);
        setError(null);
      }
      await refreshCities();
    } catch (requestError) {
      if (requestSequence === detailRequestSequence.current) {
        setError(getApiErrorMessage(requestError, t("weather.errors.delete")));
      }
    } finally {
      if (requestSequence === detailRequestSequence.current) setSaving(false);
    }
  }, [onCityRemoved, refreshCities, selectedCity]);

  const mergeCity = useCallback((updated: City) => {
    setSelectedCity((current) => current?.id === updated.id ? { ...current, ...updated } : current);
  }, []);

  const closeDetail = useCallback(() => {
    detailRequestController.current?.abort();
    detailRequestController.current = null;
    detailRequestSequence.current += 1;
    setSaving(false);
    setDetailOpen(false);
    setError(null);
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
    closeDetail,
    openSearch: () => setSearchOpen(true),
    closeSearch: () => setSearchOpen(false),
  };
}
