import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, test, vi } from "vitest";

import { compareCities } from "../api/cityRequests";
import type { City } from "../types/weather";
import { useCityComparison } from "./useCityComparison";

vi.mock("../api/cityRequests", () => ({
  compareCities: vi.fn(),
}));

function city(id: number, history?: City["history"]): City {
  return { id, name: `都市${id}`, score: id === 1 ? 90 : 50, history } as City;
}

describe("useCityComparison", () => {
  beforeEach(() => vi.clearAllMocks());

  test("preserves comparison history when an update omits history", async () => {
    const history = { period_days: 30 } as City["history"];
    vi.mocked(compareCities).mockResolvedValue({
      cities: [city(1, history), city(2)],
      meta: { count: 2, leader_id: 1, average_score: 80, history_period_days: 30 },
    });
    const { result } = renderHook(() => useCityComparison());

    act(() => {
      result.current.toggleCitySelection(1);
      result.current.toggleCitySelection(2);
    });
    await waitFor(() => expect(result.current.comparisonCities).toHaveLength(2));

    act(() => {
      result.current.replaceCity(city(1));
    });

    expect(result.current.comparisonCities[0].history).toBe(history);
  });

  test("updates the comparison leader and average with a changed city score", async () => {
    vi.mocked(compareCities).mockResolvedValue({
      cities: [city(1), city(2)],
      meta: { count: 2, leader_id: 1, average_score: 70, history_period_days: 30 },
    });
    const { result } = renderHook(() => useCityComparison());

    act(() => {
      result.current.toggleCitySelection(1);
      result.current.toggleCitySelection(2);
    });
    await waitFor(() => expect(result.current.comparisonCities).toHaveLength(2));

    act(() => result.current.replaceCity({ ...city(2), score: 100 }));

    expect(result.current.comparisonMeta).toMatchObject({ leader_id: 2, average_score: 95 });
  });

  test("clears the previous comparison while a new selection is loading", async () => {
    let resolveNext: ((value: Awaited<ReturnType<typeof compareCities>>) => void) | undefined;
    vi.mocked(compareCities)
      .mockResolvedValueOnce({
        cities: [city(1), city(2)],
        meta: { count: 2, leader_id: 1, average_score: 80, history_period_days: 30 },
      })
      .mockImplementationOnce(() => new Promise((resolve) => { resolveNext = resolve; }));

    const { result } = renderHook(() => useCityComparison());
    act(() => {
      result.current.toggleCitySelection(1);
      result.current.toggleCitySelection(2);
    });
    await waitFor(() => expect(result.current.comparisonCities).toHaveLength(2));

    act(() => {
      result.current.removeComparisonCity(1);
      result.current.toggleCitySelection(3);
    });

    await waitFor(() => expect(result.current.comparisonLoading).toBe(true));
    await waitFor(() => expect(resolveNext).toBeTypeOf("function"));
    expect(result.current.comparisonCities).toEqual([]);
    expect(result.current.comparisonMeta).toBeNull();

    await act(async () => {
      resolveNext?.({
        cities: [city(2), city(3)],
        meta: { count: 2, leader_id: 2, average_score: 70, history_period_days: 30 },
      });
    });
  });
});
