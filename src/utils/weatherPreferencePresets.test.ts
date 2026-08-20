import { describe, expect, test } from "vitest";

import { WEATHER_PREFERENCE_PRESETS } from "./weatherPreferencePresets";

describe("weather preference presets", () => {
  test("provides unique, valid presets for common use cases", () => {
    expect(WEATHER_PREFERENCE_PRESETS).toHaveLength(5);
    expect(new Set(WEATHER_PREFERENCE_PRESETS.map((preset) => preset.id)).size).toBe(5);

    WEATHER_PREFERENCE_PRESETS.forEach((preset) => {
      expect(preset.values.target_temperature).toBeGreaterThanOrEqual(-50);
      expect(preset.values.target_temperature).toBeLessThanOrEqual(60);
      expect(Object.values(preset.values).slice(1).every((weight) => weight >= 0 && weight <= 10)).toBe(true);
    });
  });

  test("air quality preset gives air quality the strongest weight", () => {
    const preset = WEATHER_PREFERENCE_PRESETS.find(({ id }) => id === "air_quality");

    expect(preset?.values.air_quality_weight).toBe(8);
    expect(preset?.values.air_quality_weight).toBeGreaterThan(preset?.values.temperature_weight ?? 0);
  });
});
