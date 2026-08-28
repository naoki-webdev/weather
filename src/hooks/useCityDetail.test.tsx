import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, test, vi } from "vitest";

import { deleteCity, fetchCity, syncCity } from "../api/cityRequests";
import type { City } from "../types/weather";
import { useCityDetail } from "./useCityDetail";

vi.mock("../api/cityRequests", () => ({
  createCity: vi.fn(),
  deleteCity: vi.fn(),
  fetchCity: vi.fn(),
  syncCity: vi.fn(),
}));

function city(id: number): City {
  return { id, name: `都市${id}` } as City;
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((promiseResolve) => {
    resolve = promiseResolve;
  });
  return { promise, resolve };
}

function options() {
  return {
    refreshCities: vi.fn().mockResolvedValue(undefined),
    onCityRemoved: vi.fn(),
    onCityUpdated: vi.fn(),
  };
}

describe("useCityDetail", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test("keeps the latest city when detail requests resolve out of order", async () => {
    const first = deferred<City>();
    const second = deferred<City>();
    vi.mocked(fetchCity).mockImplementationOnce(() => first.promise).mockImplementationOnce(() => second.promise);
    const { result } = renderHook(() => useCityDetail(options()));

    act(() => {
      void result.current.openCity(1);
      void result.current.openCity(2);
    });

    await act(async () => {
      second.resolve(city(2));
      await second.promise;
    });
    await waitFor(() => expect(result.current.selectedCity?.id).toBe(2));

    await act(async () => {
      first.resolve(city(1));
      await first.promise;
    });

    expect(result.current.selectedCity?.id).toBe(2);
  });

  test("clears a stale error after a successful detail operation", async () => {
    const apiOptions = options();
    vi.mocked(fetchCity).mockRejectedValueOnce(new Error("request failed")).mockResolvedValue(city(1));
    vi.mocked(syncCity).mockRejectedValueOnce(new Error("request failed")).mockResolvedValue(city(1));
    vi.mocked(deleteCity).mockRejectedValueOnce(new Error("request failed")).mockResolvedValue(undefined);
    const { result } = renderHook(() => useCityDetail(apiOptions));

    await act(async () => {
      await result.current.openCity(1);
    });
    expect(result.current.error).toBe("都市詳細の取得に失敗しました。");

    await act(async () => {
      await result.current.openCity(1);
    });
    expect(result.current.error).toBeNull();

    await act(async () => {
      await result.current.refreshCity();
    });
    expect(result.current.error).toBe("天候データの更新に失敗しました。");

    await act(async () => {
      await result.current.refreshCity();
    });
    expect(result.current.error).toBeNull();

    await act(async () => {
      await result.current.removeCity();
    });
    expect(result.current.error).toBe("都市の削除に失敗しました。");

    await act(async () => {
      await result.current.removeCity();
    });
    expect(result.current.error).toBeNull();
  });

  test("ignores a detail response after the drawer is closed", async () => {
    const pending = deferred<City>();
    vi.mocked(fetchCity).mockReturnValue(pending.promise);
    const { result } = renderHook(() => useCityDetail(options()));

    act(() => {
      void result.current.openCity(1);
      result.current.closeDetail();
    });

    await act(async () => {
      pending.resolve(city(1));
      await pending.promise;
    });

    expect(result.current.selectedCity).toBeNull();
    expect(result.current.detailOpen).toBe(false);
  });

  test("ignores a refresh response after another city is opened", async () => {
    const refresh = deferred<City>();
    vi.mocked(fetchCity).mockResolvedValueOnce(city(1)).mockResolvedValueOnce(city(2));
    vi.mocked(syncCity).mockReturnValue(refresh.promise);
    const apiOptions = options();
    const { result } = renderHook(() => useCityDetail(apiOptions));

    await act(async () => {
      await result.current.openCity(1);
    });
    act(() => {
      void result.current.refreshCity();
      result.current.closeDetail();
      void result.current.openCity(2);
    });
    await waitFor(() => expect(result.current.selectedCity?.id).toBe(2));

    await act(async () => {
      refresh.resolve(city(1));
      await refresh.promise;
    });

    expect(result.current.selectedCity?.id).toBe(2);
    expect(apiOptions.onCityUpdated).not.toHaveBeenCalledWith(expect.objectContaining({ id: 1 }));
  });
});
