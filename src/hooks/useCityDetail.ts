import { useCallback, useEffect, useRef, useState } from "react";

import { API_BASE_URL, requestJson, getApiErrorMessage } from "../api/client";
import { createCity, deleteCity, fetchCity, syncCity } from "../api/cityRequests";
import { t } from "../i18n";
import type { City, CitySearchResult } from "../types/weather";
import { useQueryState } from "./useQueryState";
import { isAbortError } from "./requestUtils";

type UseCityDetailOptions = {
  refreshCities: () => Promise<void>;
  onCityRemoved: (cityId: number) => void;
  onCityUpdated: (city: City) => void;
};

export function useCityDetail({ refreshCities, onCityRemoved, onCityUpdated }: UseCityDetailOptions) {
  const [detailId, setDetailId] = useQueryState<number | null>("city", null, (v): v is number | null => v === null || typeof v === "number" && Number.isSafeInteger(v) && v > 0);
  const selectedCityRef = useRef<City | null>(null);
  const [deletedCityId, setDeletedCityId] = useState<number | null>(null);
  const [selectedCity, setSelectedCity] = useState<City | null>(null);
  selectedCityRef.current = selectedCity;
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
      setDetailId(id);
      setSelectedCity(city);
      setDetailOpen(true);
      setError(null);
    } catch (requestError) {
      if (!controller.signal.aborted && !isAbortError(requestError) && requestSequence === detailRequestSequence.current) {
        setError(getApiErrorMessage(requestError, t("weather.errors.fetch_detail")));
      }
    }
  }, []);

  useEffect(() => {
    if (detailId === null) { setDetailOpen(false); return; }
    if (selectedCityRef.current?.id !== detailId) void openCity(detailId);
    else setDetailOpen(true);
  }, [detailId, openCity]);

  const historyDetailRef = useRef(detailId);
  historyDetailRef.current = detailId;
  useEffect(() => {
    const navigate = () => {
      let next: number | null = null;
      try {
        const value: unknown = JSON.parse(new URL(window.location.href).searchParams.get("city") ?? "null");
        if (typeof value === "number" && Number.isSafeInteger(value) && value > 0) next = value;
      } catch { /* 不正なIDは閉じた状態 */ }
      if (next !== historyDetailRef.current) { detailRequestController.current?.abort(); detailRequestSequence.current += 1; }
    };
    window.addEventListener("popstate",navigate);
    return () => window.removeEventListener("popstate",navigate);
  }, []);

  const undoDelete = useCallback(async () => {
    if (deletedCityId === null) return;
    try {
      await requestJson<City>(API_BASE_URL + "/api/cities/" + deletedCityId + "/restore", { method: "POST", body: "{}" });
      setDeletedCityId(null);
      await refreshCities();
    } catch { setError("復元期限を過ぎたか、復元に失敗しました。"); }
  }, [deletedCityId, refreshCities]);

  const addCity = useCallback(async (city: CitySearchResult) => {
    detailRequestController.current?.abort();
    detailRequestController.current = null;
    const requestSequence = ++detailRequestSequence.current;
    setSaving(true);
    setError(null);
    try {
      const created = await createCity(city);
      if (requestSequence === detailRequestSequence.current) {
        setDetailId(created.id);
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

  const reloadSelectedCity = useCallback(async () => {
    if (!selectedCity) return;
    detailRequestController.current?.abort();
    const controller = new AbortController();
    detailRequestController.current = controller;
    const requestSequence = ++detailRequestSequence.current;
    const cityId = selectedCity.id;

    try {
      const updated = await fetchCity(cityId, controller.signal);
      if (controller.signal.aborted || requestSequence !== detailRequestSequence.current) return;
      setSelectedCity(updated);
      onCityUpdated(updated);
      setError(null);
    } catch (requestError) {
      if (!controller.signal.aborted && !isAbortError(requestError) && requestSequence === detailRequestSequence.current) {
        setError(getApiErrorMessage(requestError, t("weather.errors.fetch_detail")));
      }
    }
  }, [onCityUpdated, selectedCity]);

  const removeCity = useCallback(async () => {
    if (!selectedCity) return;
    const cityId = selectedCity.id;
    const requestSequence = ++detailRequestSequence.current;
    detailRequestController.current?.abort();
    detailRequestController.current = null;
    setSaving(true);
    try {
      await deleteCity(cityId);
      setDeletedCityId(cityId);
      if (selectedCityRef.current?.id === cityId) setDetailId(null);
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
    setDetailId(null);
    detailRequestController.current?.abort();
    detailRequestController.current = null;
    detailRequestSequence.current += 1;
    setSaving(false);
    setDetailOpen(false);
    setError(null);
  }, []);

  return {
    deletedCityId,
    undoDelete,
    selectedCity,
    detailOpen,
    searchOpen,
    saving,
    error,
    openCity,
    addCity,
    refreshCity,
    reloadSelectedCity,
    removeCity,
    mergeCity,
    closeDetail,
    openSearch: () => setSearchOpen(true),
    closeSearch: () => setSearchOpen(false),
  };
}
