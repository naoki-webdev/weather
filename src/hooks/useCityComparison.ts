import { useCallback, useEffect, useRef, useState } from "react";

import { compareCities } from "../api/cityRequests";
import { getApiErrorMessage } from "../api/client";
import { t } from "../i18n";
import type { City, CityComparisonResponse } from "../types/weather";
import { isAbortError } from "./requestUtils";

export function useCityComparison(preferenceUpdatedAt?: string) {
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [comparison, setComparison] = useState<{ cities: City[]; meta: CityComparisonResponse["meta"] | null }>({ cities: [], meta: null });
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
      setComparison({ cities: [], meta: null });
      setComparisonError(null);
      setComparisonLoading(false);
      return () => controller.abort();
    }

    setComparisonLoading(true);
    setComparisonError(null);
    setComparison({ cities: [], meta: null });
    compareCities(selectedIds, controller.signal)
      .then((response) => {
        if (controller.signal.aborted || requestSequence !== comparisonRequestSequence.current) return;
        setComparison({ cities: response.cities, meta: response.meta });
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
    setComparison((current) => {
      const cities = current.cities.map((city) => {
      if (city.id !== updated.id) return city;
      return updated.history === undefined ? { ...updated, history: city.history } : updated;
      });
      if (!current.meta || !cities.some((city) => city.id === updated.id)) return { ...current, cities };
      const scored = cities.filter((city): city is City & { score: number } => typeof city.score === "number" && Number.isFinite(city.score));
      const best = scored.reduce<City & { score: number } | null>((leader, city) => !leader || city.score > leader.score ? city : leader, null);
      return {
        cities,
        meta: {
          ...current.meta,
          count: cities.length,
          leader_id: best?.id ?? null,
          average_score: scored.length ? Math.round((scored.reduce((sum, city) => sum + city.score, 0) / scored.length) * 10) / 10 : null,
        },
      };
    });
  }, []);

  return {
    selectedIds,
    comparisonCities: comparison.cities,
    comparisonMeta: comparison.meta,
    comparisonLoading,
    comparisonError,
    toggleCitySelection,
    removeComparisonCity,
    clearComparison: () => setSelectedIds([]),
    removeCity: removeComparisonCity,
    replaceCity,
  };
}
