import { render, screen } from "@testing-library/react";
import { describe, expect, test, vi } from "vitest";

import CityComparisonPanel from "./CityComparisonPanel";
import type { City } from "../types/weather";

function city(id: number, name: string) {
  return { id, name } as City;
}

function renderPanel(selectedCount: number, cities: City[]) {
  return render(
    <CityComparisonPanel
      selectedCount={selectedCount}
      cities={cities}
      leaderId={null}
      averageScore={null}
      historyPeriodDays={30}
      loading={false}
      error={null}
      onRemove={vi.fn()}
      onClear={vi.fn()}
      onPlanTravel={vi.fn()}
      travelPlan={null}
      travelLoading={false}
      travelError={null}
      bestDeparturePlan={null}
      bestDepartureLoading={false}
      bestDepartureError={null}
      onPlanBestDeparture={vi.fn()}
    />,
  );
}

describe("CityComparisonPanel travel planner", () => {
  test("does not show the travel planner when three cities are selected", () => {
    renderPanel(3, [city(1, "東京"), city(2, "札幌"), city(3, "福岡")]);

    expect(screen.queryByRole("button", { name: "到着時の天気を見る" })).not.toBeInTheDocument();
  });

  test("shows the travel planner for exactly two selected cities", () => {
    renderPanel(2, [city(1, "東京"), city(2, "札幌")]);

    expect(screen.getByRole("button", { name: "到着時の天気を見る" })).toBeInTheDocument();
  });
});
