import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, test, vi } from "vitest";

import type { City } from "../types/weather";
import CityTable from "./CityTable";

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
  favorite: true,
  score: 85,
  score_breakdown: { temperature: 92, precipitation: 88, humidity: 76, wind: 55, air_quality: 71 },
  score_weights: { temperature: 5, precipitation: 4, humidity: 2, wind: 2, air_quality: 3 },
  score_insight: { primary_component: "temperature", primary_weight: 5 },
  weather: {
    fetched_at: "2026-08-28T01:00:00.000Z",
    current: { temperature: 24.2, humidity: 60, precipitation: 0, wind_speed: 8.4, weather_code: 1, us_aqi: 30, pm2_5: null, pm10: null },
    daily: { precipitation_probability_max: [10] },
  },
  created_at: "2026-08-01T00:00:00.000Z",
  updated_at: "2026-08-28T01:00:00.000Z",
};

describe("CityTable", () => {
  test("does not open the detail row when a table control receives Space", () => {
    const onRowClick = vi.fn();

    render(
      <CityTable
        cities={[city]}
        page={1}
        perPage={20}
        totalCount={1}
        sort="score"
        direction="desc"
        onSortChange={vi.fn()}
        onPageChange={vi.fn()}
        onPerPageChange={vi.fn()}
        onRowClick={onRowClick}
        selectedIds={[]}
        onToggleSelect={vi.fn()}
        onToggleFavorite={vi.fn()}
        favoriteSavingIds={[]}
        readOnly={false}
      />,
    );

    const checkbox = screen.getByRole("checkbox", { name: /東京.*比較/ });
    fireEvent.keyDown(checkbox, { key: " " });

    expect(onRowClick).not.toHaveBeenCalled();
  });
});
