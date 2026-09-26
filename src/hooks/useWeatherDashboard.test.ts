import { act, renderHook, waitFor } from "@testing-library/react";
import { expect, it, vi } from "vitest";
import { fetchCities, updateCityFavorite } from "../api/cityRequests";
import type { City } from "../types/weather";
import { useWeatherDashboard } from "./useWeatherDashboard";

const callbacks = vi.hoisted(() => ({
  preferenceSaved: null as (() => Promise<void>) | null,
  reloadSelectedCity: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("../api/cityRequests", () => ({ fetchCities: vi.fn(), updateCityFavorite: vi.fn(), downloadCitiesCsv: vi.fn() }));
vi.mock("./useWeatherPreference", () => ({ useWeatherPreference: (onSaved: () => Promise<void>) => { callbacks.preferenceSaved = onSaved; return {}; } }));
vi.mock("./useCityComparison", () => ({ useCityComparison: () => ({ selectedIds: [], replaceCity: vi.fn(), removeCity: vi.fn() }) }));
vi.mock("./useCityDetail", () => ({ useCityDetail: () => ({ mergeCity: vi.fn(), reloadSelectedCity: callbacks.reloadSelectedCity }) }));
vi.mock("./useTravelPlan", () => ({ useTravelPlan: () => ({}) }));

it("reloads the current favorite filter when an unfavorite finishes after switching filters", async () => {
  const city = { id: 1, name: "東京", favorite: true } as City;
  let favorite = true;
  let resolveUpdate!: (city: City) => void;
  vi.mocked(updateCityFavorite).mockReturnValue(new Promise((resolve) => { resolveUpdate = resolve; }));
  vi.mocked(fetchCities).mockImplementation(async (params) => {
    const cities = params?.favorites_only && !favorite ? [] : [{ ...city, favorite }];
    return { cities, meta: { page: 1, per_page: 20, total_count: cities.length, summary: { recommended: 0, average_temperature: null, refreshed: 0 } } };
  });
  const { result } = renderHook(() => useWeatherDashboard());
  await waitFor(() => expect(result.current.cities).toHaveLength(1));
  let request!: Promise<void>;
  act(() => { request = result.current.toggleFavorite(1, false); });
  act(() => { result.current.setFavoritesOnly(true); });
  await waitFor(() => expect(result.current.loading).toBe(false));
  await act(async () => {
    favorite = false;
    resolveUpdate({ ...city, favorite: false });
    await request;
  });
  expect(result.current.cities).toEqual([]);
  expect(result.current.totalCount).toBe(0);
});

it("reloads open city details after preferences are saved", async () => {
  vi.mocked(fetchCities).mockResolvedValue({
    cities: [],
    meta: { page: 1, per_page: 20, total_count: 0, summary: { recommended: 0, average_temperature: null, refreshed: 0 } },
  });
  renderHook(() => useWeatherDashboard());

  await act(async () => { await callbacks.preferenceSaved?.(); });

  expect(callbacks.reloadSelectedCity).toHaveBeenCalledOnce();
});
