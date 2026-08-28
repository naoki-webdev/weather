import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, test, vi } from "vitest";

import type { City } from "../types/weather";
import CityDetailDrawer from "./CityDetailDrawer";

const city: City = {
  id: 1,
  name: "東京",
  country: "日本",
  country_code: "JP",
  admin1: "東京都",
  latitude: 35.6762,
  longitude: 139.6503,
  timezone: "Asia/Tokyo",
  external_id: "tokyo",
  source_name: "Open-Meteo",
  favorite: false,
  score: 85,
  score_breakdown: { temperature: 92, precipitation: 88, humidity: 76, wind: 55, air_quality: 71 },
  score_weights: { temperature: 5, precipitation: 4, humidity: 2, wind: 2, air_quality: 3 },
  score_insight: { primary_component: "temperature", primary_weight: 5 },
  weather: {
    fetched_at: "2026-08-28T01:00:00.000Z",
    current: { temperature: 24.2, humidity: 60, precipitation: 0, wind_speed: 8.4, weather_code: 1, us_aqi: 30, pm2_5: null, pm10: null },
    daily: { time: ["2026-08-28"], temperature_2m_max: [27], temperature_2m_min: [20], precipitation_probability_max: [10] },
  },
  history: {
    period_days: 30,
    from: "2026-07-29T00:00:00.000Z",
    to: "2026-08-28T00:00:00.000Z",
    snapshot_count: 30,
    average_score: 78.4,
    current_score: 85,
    score_delta: 6.6,
    averages: { temperature: 23.1, humidity: 58, precipitation: 0.1, wind_speed: 7.5, us_aqi: 28 },
  },
  created_at: "2026-08-01T00:00:00.000Z",
  updated_at: "2026-08-28T01:00:00.000Z",
};

describe("CityDetailDrawer", () => {
  test("shows compact weather sections and closes with the icon button", () => {
    const onClose = vi.fn();

    render(<CityDetailDrawer open city={city} readOnly saving={false} onClose={onClose} onSync={vi.fn()} onDelete={vi.fn()} />);

    expect(screen.getByText("現在の状況")).toBeInTheDocument();
    expect(screen.getByText("直近30日平均との比較")).toBeInTheDocument();
    const closeButton = screen.getByRole("button", { name: "閉じる" });
    expect(closeButton.querySelector("svg")).not.toBeNull();
    expect(closeButton).not.toHaveTextContent("閉じる");

    fireEvent.click(closeButton);

    expect(onClose).toHaveBeenCalledOnce();
  });

  test("marks unavailable score components instead of treating them as zero", () => {
    render(<CityDetailDrawer open city={{ ...city, score_breakdown: { ...city.score_breakdown, wind: null } }} readOnly saving={false} onClose={vi.fn()} onSync={vi.fn()} onDelete={vi.fn()} />);

    expect(screen.getByText("—")).toBeInTheDocument();
  });
});
