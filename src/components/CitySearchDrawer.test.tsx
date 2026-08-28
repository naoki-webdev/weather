import { act, fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, test, vi } from "vitest";

import { searchCities } from "../api/cityRequests";
import type { CitySearchResult } from "../types/weather";
import CitySearchDrawer from "./CitySearchDrawer";

vi.mock("../api/cityRequests", () => ({
  searchCities: vi.fn(),
}));

const city: CitySearchResult = {
  external_id: "1",
  name: "東京",
  country: "日本",
  country_code: "JP",
  admin1: "東京都",
  latitude: 35.6762,
  longitude: 139.6503,
  timezone: "Asia/Tokyo",
  source_name: "Open-Meteo",
};

describe("CitySearchDrawer", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test("does not start a second search while the first request is loading", async () => {
    let resolveSearch: (results: CitySearchResult[]) => void = () => {};
    vi.mocked(searchCities).mockReturnValueOnce(new Promise((resolve) => {
      resolveSearch = resolve;
    }));

    render(<CitySearchDrawer open readOnly={false} submitting={false} onClose={vi.fn()} onAdd={vi.fn()} />);
    const input = screen.getByRole("textbox", { name: "都市名・地域名" });
    const button = screen.getByRole("button", { name: "検索" });

    fireEvent.change(input, { target: { value: "東京" } });
    fireEvent.click(button);
    expect(searchCities).toHaveBeenCalledTimes(1);
    expect(searchCities).toHaveBeenCalledWith("東京", expect.any(AbortSignal));

    fireEvent.change(input, { target: { value: "大阪" } });
    fireEvent.keyDown(input, { key: "Enter" });
    expect(searchCities).toHaveBeenCalledTimes(1);

    resolveSearch([city]);
  });

  test("aborts an in-flight search and clears results when closed", async () => {
    let resolveSearch: (results: CitySearchResult[]) => void = () => {};
    vi.mocked(searchCities).mockReturnValueOnce(new Promise((resolve) => {
      resolveSearch = resolve;
    }));

    const { rerender } = render(<CitySearchDrawer open readOnly={false} submitting={false} onClose={vi.fn()} onAdd={vi.fn()} />);
    const input = screen.getByRole("textbox", { name: "都市名・地域名" });
    fireEvent.change(input, { target: { value: "東京" } });
    fireEvent.click(screen.getByRole("button", { name: "検索" }));

    const requestSignal = vi.mocked(searchCities).mock.calls[0][1];
    expect(requestSignal?.aborted).toBe(false);

    rerender(<CitySearchDrawer open={false} readOnly={false} submitting={false} onClose={vi.fn()} onAdd={vi.fn()} />);
    expect(requestSignal?.aborted).toBe(true);

    await act(async () => {
      resolveSearch([city]);
      await Promise.resolve();
    });

    rerender(<CitySearchDrawer open readOnly={false} submitting={false} onClose={vi.fn()} onAdd={vi.fn()} />);
    expect(screen.queryByText("東京")).not.toBeInTheDocument();
  });
});
