import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, test, vi } from "vitest";

import { fetchBestDeparturePlan, fetchTravelPlan } from "../api/travelRequests";
import type { BestDeparturePlan, TravelPlan } from "../types/weather";
import { useTravelPlan } from "./useTravelPlan";

vi.mock("../api/travelRequests", () => ({
  fetchBestDeparturePlan: vi.fn(),
  fetchTravelPlan: vi.fn(),
}));

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((promiseResolve) => {
    resolve = promiseResolve;
  });
  return { promise, resolve };
}

describe("useTravelPlan", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test("ignores travel responses that resolve after the selected cities change", async () => {
    const travel = deferred<TravelPlan>();
    const bestDeparture = deferred<BestDeparturePlan>();
    let travelSignal: AbortSignal | undefined;
    let bestDepartureSignal: AbortSignal | undefined;
    vi.mocked(fetchTravelPlan).mockImplementation((_fromId, _toId, _departureAt, signal) => {
      travelSignal = signal;
      return travel.promise;
    });
    vi.mocked(fetchBestDeparturePlan).mockImplementation((_fromId, _toId, _windowStart, _windowEnd, _intervalMinutes, signal) => {
      bestDepartureSignal = signal;
      return bestDeparture.promise;
    });

    const { result, rerender } = renderHook(({ selectedIds }) => useTravelPlan(selectedIds), { initialProps: { selectedIds: [1, 2] } });

    act(() => {
      void result.current.planTravel("2026-08-28T09:00:00.000Z");
      void result.current.planBestDeparture("2026-08-28T09:00:00.000Z", "2026-08-28T12:00:00.000Z");
    });
    rerender({ selectedIds: [1, 3] });

    expect(travelSignal?.aborted).toBe(true);
    expect(bestDepartureSignal?.aborted).toBe(true);

    await act(async () => {
      travel.resolve({} as TravelPlan);
      bestDeparture.resolve({} as BestDeparturePlan);
      await Promise.all([travel.promise, bestDeparture.promise]);
    });

    expect(result.current.travelPlan).toBeNull();
    expect(result.current.bestDeparturePlan).toBeNull();
  });
});
