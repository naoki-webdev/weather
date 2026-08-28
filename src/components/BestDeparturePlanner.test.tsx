import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, test, vi } from "vitest";

import BestDeparturePlanner from "./BestDeparturePlanner";
import type { City } from "../types/weather";

const city = (id: number, name: string): City => ({ id, name, timezone: "Asia/Tokyo" } as City);

describe("BestDeparturePlanner", () => {
  test("shows an informational result when no arrival forecast is available", () => {
    render(
      <BestDeparturePlanner
        from={city(1, "東京")}
        to={city(2, "横浜")}
        loading={false}
        error={null}
        onPlan={vi.fn()}
        plan={{
          from: { id: 1, name: "東京", timezone: "Asia/Tokyo" },
          to: { id: 2, name: "横浜", timezone: "Asia/Tokyo" },
          mode: "driving",
          transfer_count: 0,
          duration_minutes: 42,
          distance_km: 45,
          window_start: "2026-08-20T00:00:00.000Z",
          window_end: "2026-08-20T00:30:00.000Z",
          interval_minutes: 15,
          recommended: null,
          candidates: [{
            departure_at: "2026-08-20T00:00:00.000Z",
            arrival_at: "2026-08-20T00:42:00.000Z",
            arrival_weather: null,
            weather_score: null,
            recommendation: { code: "unknown" },
          }],
          reason: "この時間帯の到着時予報を取得できませんでした。",
        }}
      />,
    );

    expect(screen.getByText("この時間帯の到着時予報を取得できませんでした。", { exact: true })).toBeInTheDocument();
    expect(screen.queryByRole("table", { name: "出発時刻候補" })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "候補を見る（1件）" }));
    expect(screen.getByRole("table", { name: "出発時刻候補" })).toBeInTheDocument();
  });
});
