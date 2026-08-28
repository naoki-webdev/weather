import type { WeatherPreference } from "../types/weather";

type PreferenceValues = Pick<
  WeatherPreference,
  | "target_temperature"
  | "temperature_weight"
  | "precipitation_weight"
  | "humidity_weight"
  | "wind_weight"
  | "air_quality_weight"
>;

export type WeatherPreferencePreset = {
  id: string;
  labelKey: string;
  descriptionKey: string;
  values: PreferenceValues;
};

export const WEATHER_PREFERENCE_PRESETS: WeatherPreferencePreset[] = [
  {
    id: "outdoor",
    labelKey: "weather.preference.presets.outdoor.label",
    descriptionKey: "weather.preference.presets.outdoor.description",
    values: { target_temperature: 22, temperature_weight: 4, precipitation_weight: 5, humidity_weight: 2, wind_weight: 2, air_quality_weight: 3 },
  },
  {
    id: "running",
    labelKey: "weather.preference.presets.running.label",
    descriptionKey: "weather.preference.presets.running.description",
    values: { target_temperature: 16, temperature_weight: 5, precipitation_weight: 4, humidity_weight: 2, wind_weight: 4, air_quality_weight: 3 },
  },
  {
    id: "laundry",
    labelKey: "weather.preference.presets.laundry.label",
    descriptionKey: "weather.preference.presets.laundry.description",
    values: { target_temperature: 23, temperature_weight: 2, precipitation_weight: 6, humidity_weight: 5, wind_weight: 3, air_quality_weight: 1 },
  },
  {
    id: "heat_avoidance",
    labelKey: "weather.preference.presets.heat_avoidance.label",
    descriptionKey: "weather.preference.presets.heat_avoidance.description",
    values: { target_temperature: 18, temperature_weight: 7, precipitation_weight: 2, humidity_weight: 2, wind_weight: 2, air_quality_weight: 2 },
  },
  {
    id: "air_quality",
    labelKey: "weather.preference.presets.air_quality.label",
    descriptionKey: "weather.preference.presets.air_quality.description",
    values: { target_temperature: 21, temperature_weight: 2, precipitation_weight: 2, humidity_weight: 2, wind_weight: 1, air_quality_weight: 8 },
  },
];
