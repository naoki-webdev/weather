import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import type { WeatherPreference } from "../types/weather";
import WeatherPreferenceDrawer from "./WeatherPreferenceDrawer";

const preference = {
  id: 1,
  target_temperature: 20,
  temperature_weight: 5,
  precipitation_weight: 4,
  humidity_weight: 3,
  wind_weight: 2,
  air_quality_weight: 1,
  created_at: "2026-01-01T00:00:00.000Z",
  updated_at: "2026-01-01T00:00:00.000Z",
} satisfies WeatherPreference;

describe("WeatherPreferenceDrawer", () => {
  it("discards unsaved values when closed and reopened", () => {
    const props = { open: true, readOnly: false, saving: false, preference, onClose: vi.fn(), onSave: vi.fn() };
    const { rerender } = render(<WeatherPreferenceDrawer {...props} />);
    const input = screen.getByRole("spinbutton", { name: "理想の気温" });
    fireEvent.change(input, { target: { value: "32" } });
    expect(input).toHaveValue(32);

    rerender(<WeatherPreferenceDrawer {...props} open={false} />);
    rerender(<WeatherPreferenceDrawer {...props} open />);

    expect(screen.getByRole("spinbutton", { name: "理想の気温" })).toHaveValue(20);
  });
});
