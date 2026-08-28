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
});
