import { useCallback, useEffect, useRef, useState } from "react";

import { compareCities } from "../api/cityRequests";
import { getApiErrorMessage } from "../api/client";
import { t } from "../i18n";
import type { City, CityComparisonResponse } from "../types/weather";
import { isAbortError } from "./requestUtils";

export function useCityComparison(preferenceUpdatedAt?: string) {
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [comparisonCities, setComparisonCities] = useState<City[]>([]);
  const [comparisonMeta, setComparisonMeta] = useState<CityComparisonResponse["meta"] | null>(null);
  const [comparisonLoading, setComparisonLoading] = useState(false);
  const [comparisonError, setComparisonError] = useState<string | null>(null);
  const comparisonRequestSequence = useRef(0);
  const comparisonRequestController = useRef<AbortController | null>(null);

  useEffect(() => {
    comparisonRequestController.current?.abort();
    const controller = new AbortController();
    comparisonRequestController.current = controller;
    const requestSequence = ++comparisonRequestSequence.current;

    if (selectedIds.length < 2) {
      setComparisonCities([]);
      setComparisonMeta(null);
      setComparisonError(null);
      setComparisonLoading(false);
      return () => controller.abort();
    }

    setComparisonLoading(true);
    setComparisonError(null);
    compareCities(selectedIds, controller.signal)
      .then((response) => {
        if (controller.signal.aborted || requestSequence !== comparisonRequestSequence.current) return;
        setComparisonCities(response.cities);
        setComparisonMeta(response.meta);
      })
      .catch((requestError: unknown) => {
        if (!controller.signal.aborted && !isAbortError(requestError) && requestSequence === comparisonRequestSequence.current) {
          setComparisonError(getApiErrorMessage(requestError, t("weather.errors.compare")));
        }
      })
      .finally(() => {
        if (requestSequence === comparisonRequestSequence.current) setComparisonLoading(false);
      });

    return () => controller.abort();
  }, [preferenceUpdatedAt, selectedIds]);

  const toggleCitySelection = useCallback((cityId: number) => {
    setSelectedIds((current) => current.includes(cityId)
      ? current.filter((id) => id !== cityId)
      : current.length >= 4 ? current : [...current, cityId]);
  }, []);

  const removeComparisonCity = useCallback((cityId: number) => {
    setSelectedIds((current) => current.filter((id) => id !== cityId));
  }, []);

  const replaceCity = useCallback((updated: City) => {
    setComparisonCities((current) => current.map((city) => {
      if (city.id !== updated.id) return city;
      return updated.history === undefined ? { ...updated, history: city.history } : updated;
    }));
  }, []);

  return {
    selectedIds,
    comparisonCities,
    comparisonMeta,
    comparisonLoading,
    comparisonError,
    toggleCitySelection,
    removeComparisonCity,
    clearComparison: () => setSelectedIds([]),
    removeCity: removeComparisonCity,
    replaceCity,
  };
}
