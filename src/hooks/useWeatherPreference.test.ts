import { renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, test, vi } from "vitest";

import { fetchWeatherPreference } from "../api/cityRequests";
import { useWeatherPreference } from "./useWeatherPreference";

vi.mock("../api/cityRequests", () => ({
  fetchWeatherPreference: vi.fn(),
  updateWeatherPreference: vi.fn(),
}));

describe("useWeatherPreference", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test("aborts the initial request when the hook unmounts", async () => {
    vi.mocked(fetchWeatherPreference).mockReturnValue(new Promise(() => {}));
    const { unmount } = renderHook(() => useWeatherPreference(vi.fn().mockResolvedValue(undefined)));

    await waitFor(() => expect(fetchWeatherPreference).toHaveBeenCalledOnce());
    const signal = vi.mocked(fetchWeatherPreference).mock.calls[0][0];

    unmount();

    expect(signal?.aborted).toBe(true);
  });
});
