import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, test, vi } from "vitest";

import { fetchCities, updateCityFavorite } from "../api/cityRequests";
import type { City } from "../types/weather";
import { useCitiesList } from "./useCitiesList";

vi.mock("../api/cityRequests", () => ({
  downloadCitiesCsv: vi.fn(),
  fetchCities: vi.fn(),
  updateCityFavorite: vi.fn(),
}));

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((promiseResolve) => {
    resolve = promiseResolve;
  });
  return { promise, resolve };
}

function city(favorite: boolean): City {
  return { id: 1, name: "東京", favorite } as City;
}

describe("useCitiesList", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(fetchCities).mockResolvedValue({
      cities: [],
      meta: { page: 1, per_page: 20, total_count: 0, summary: { recommended: 0, average_temperature: null, refreshed: 0 } },
    });
  });

  test("ignores an older favorite response when requests overlap for the same city", async () => {
    const first = deferred<City>();
    const second = deferred<City>();
    vi.mocked(updateCityFavorite).mockImplementationOnce(() => first.promise).mockImplementationOnce(() => second.promise);

    const { result } = renderHook(() => useCitiesList());
    await waitFor(() => expect(fetchCities).toHaveBeenCalled());

    let firstRequest!: Promise<City | null>;
    let secondRequest!: Promise<City | null>;
    act(() => {
      firstRequest = result.current.toggleFavorite(1, true);
      secondRequest = result.current.toggleFavorite(1, false);
    });

    await act(async () => {
      second.resolve(city(false));
      await secondRequest;
    });
    await act(async () => {
      first.resolve(city(true));
      await firstRequest;
    });

    expect(await secondRequest).toEqual(city(false));
    expect(await firstRequest).toBeNull();
    expect(result.current.favoriteSavingIds).toEqual([]);
  });

  test("uses current filters when an older load callback runs later", async () => {
    const { result } = renderHook(() => useCitiesList());
    await waitFor(() => expect(fetchCities).toHaveBeenCalled());
    const oldLoad = result.current.loadCities;

    act(() => result.current.setKeyword("京都"));
    await act(async () => {
      await oldLoad();
    });

    expect(fetchCities).toHaveBeenLastCalledWith(
      expect.objectContaining({ keyword: "京都" }),
      expect.any(AbortSignal),
    );
  });

  test("does not reuse a completed favorite request number", async () => {
    const first = deferred<City>();
    const second = deferred<City>();
    const third = deferred<City>();
    vi.mocked(updateCityFavorite)
      .mockReturnValueOnce(first.promise)
      .mockReturnValueOnce(second.promise)
      .mockReturnValueOnce(third.promise);
    const { result } = renderHook(() => useCitiesList());
    await waitFor(() => expect(result.current.loading).toBe(false));
    let a!: Promise<City | null>;
    let b!: Promise<City | null>;
    let c!: Promise<City | null>;
    act(() => { a = result.current.toggleFavorite(1, true); b = result.current.toggleFavorite(1, false); });
    await act(async () => { second.resolve(city(false)); await b; });
    act(() => { c = result.current.toggleFavorite(1, true); });
    await act(async () => { first.resolve(city(true)); expect(await a).toBeNull(); });
    expect(result.current.favoriteSavingIds).toEqual([1]);
    await act(async () => { third.resolve(city(true)); expect(await c).toEqual(city(true)); });
  });
});
