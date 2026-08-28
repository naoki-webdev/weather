import { useCallback, useEffect, useRef, useState } from "react";

import { getApiErrorMessage } from "../api/client";
import { fetchBestDeparturePlan, fetchTravelPlan } from "../api/travelRequests";
import { t } from "../i18n";
import type { BestDeparturePlan, TravelPlan } from "../types/weather";

export function useTravelPlan(selectedIds: number[]) {
  const [travelPlan, setTravelPlan] = useState<TravelPlan | null>(null);
  const [travelLoading, setTravelLoading] = useState(false);
  const [travelError, setTravelError] = useState<string | null>(null);
  const [bestDeparturePlan, setBestDeparturePlan] = useState<BestDeparturePlan | null>(null);
  const [bestDepartureLoading, setBestDepartureLoading] = useState(false);
  const [bestDepartureError, setBestDepartureError] = useState<string | null>(null);
  const travelRequestSequence = useRef(0);
  const travelRequestController = useRef<AbortController | null>(null);
  const bestDepartureRequestSequence = useRef(0);
  const bestDepartureRequestController = useRef<AbortController | null>(null);

  useEffect(() => {
    travelRequestSequence.current += 1;
    bestDepartureRequestSequence.current += 1;
    travelRequestController.current?.abort();
    bestDepartureRequestController.current?.abort();
    travelRequestController.current = null;
    bestDepartureRequestController.current = null;
    setTravelPlan(null);
    setTravelLoading(false);
    setTravelError(null);
    setBestDeparturePlan(null);
    setBestDepartureLoading(false);
    setBestDepartureError(null);

    return () => {
      travelRequestController.current?.abort();
      bestDepartureRequestController.current?.abort();
    };
  }, [selectedIds]);

  const planTravel = useCallback(async (departureAt?: string) => {
    if (selectedIds.length !== 2) return;
    travelRequestController.current?.abort();
    const controller = new AbortController();
    travelRequestController.current = controller;
    const requestSequence = ++travelRequestSequence.current;
    setTravelLoading(true);
    setTravelPlan(null);
    setTravelError(null);
    try {
      const response = await fetchTravelPlan(selectedIds[0], selectedIds[1], departureAt, controller.signal);
      if (!controller.signal.aborted && requestSequence === travelRequestSequence.current) setTravelPlan(response);
    } catch (requestError) {
      if (!controller.signal.aborted && requestSequence === travelRequestSequence.current) {
        setTravelError(getApiErrorMessage(requestError, t("weather.errors.travel")));
      }
    } finally {
      if (requestSequence === travelRequestSequence.current) setTravelLoading(false);
    }
  }, [selectedIds]);

  const planBestDeparture = useCallback(async (windowStart: string, windowEnd: string, intervalMinutes = 15) => {
    if (selectedIds.length !== 2) return;
    bestDepartureRequestController.current?.abort();
    const controller = new AbortController();
    bestDepartureRequestController.current = controller;
    const requestSequence = ++bestDepartureRequestSequence.current;
    setBestDepartureLoading(true);
    setBestDeparturePlan(null);
    setBestDepartureError(null);
    try {
      const response = await fetchBestDeparturePlan(selectedIds[0], selectedIds[1], windowStart, windowEnd, intervalMinutes, controller.signal);
      if (!controller.signal.aborted && requestSequence === bestDepartureRequestSequence.current) setBestDeparturePlan(response);
    } catch (requestError) {
      if (!controller.signal.aborted && requestSequence === bestDepartureRequestSequence.current) {
        setBestDepartureError(getApiErrorMessage(requestError, t("weather.errors.travel")));
      }
    } finally {
      if (requestSequence === bestDepartureRequestSequence.current) setBestDepartureLoading(false);
    }
  }, [selectedIds]);

  return { travelPlan, travelLoading, travelError, planTravel, bestDeparturePlan, bestDepartureLoading, bestDepartureError, planBestDeparture };
}
