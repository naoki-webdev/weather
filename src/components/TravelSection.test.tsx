import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, test, vi } from "vitest";

import type { BestDeparturePlan, City, TravelPlan } from "../types/weather";
import TravelSection from "./TravelSection";

const city = (id: number, name: string): City => ({ id, name, timezone: "Asia/Tokyo" } as City);

const travelPlan: TravelPlan = {
  from: { id: 1, name: "福岡", timezone: "Asia/Tokyo" },
  to: { id: 2, name: "東京", timezone: "Asia/Tokyo" },
  mode: "driving",
  transfer_count: 0,
  departure_at: "2026-08-22T00:43:00.000Z",
  arrival_at: "2026-08-22T08:40:00.000Z",
  duration_minutes: 478,
  distance_km: 1081.2,
  arrival_weather: {
    time: "2026-08-22T08:00",
    temperature: 27,
    precipitation_probability: 98,
    precipitation: 0.4,
    wind_speed: 3.3,
    weather_code: 51,
  },
  recommendation: { code: "umbrella" },
};

function renderSection(plan: TravelPlan | null = travelPlan) {
  return render(
    <TravelSection
      from={city(1, "福岡")}
      to={city(2, "東京")}
      travelPlan={plan}
      travelLoading={false}
      travelError={null}
      onPlanTravel={vi.fn()}
      bestDeparturePlan={null as BestDeparturePlan | null}
      bestDepartureLoading={false}
      bestDepartureError={null}
      onPlanBestDeparture={vi.fn()}
    />,
  );
}

describe("TravelSection result card", () => {
  test("closes the arrival weather result when the close button is clicked", async () => {
    renderSection();

    expect(screen.getByText("到着時の天気")).toBeInTheDocument();
    expect(screen.getByText("福岡 → 東京（車移動の目安）")).toBeInTheDocument();
    expect(screen.getByText("降水確率 98% / 風速 3.3 km/h")).toBeInTheDocument();
    const closeButton = screen.getByRole("button", { name: "閉じる" });
    expect(closeButton.querySelector("svg")).not.toBeNull();
    expect(closeButton).not.toHaveTextContent("閉じる");
    fireEvent.click(closeButton);

    await waitFor(() => expect(screen.queryByText("到着時の天気")).not.toBeInTheDocument());
  });

  test("does not render a result card before travel has completed", () => {
    renderSection(null);

    expect(screen.queryByText("到着時の天気")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "閉じる" })).not.toBeInTheDocument();
  });
});
