import type { City, WeatherPreference, WeatherSnapshot } from "@prisma/client";

import { historyFor } from "./weather-history";
import { breakdownFor, primaryComponentFor, scoreFor, weightsFor, type WeatherPreferenceLike } from "./weather-score";

export type CityWithSnapshots = City & { weatherSnapshots: WeatherSnapshot[] };

function numberOrNull(value: unknown) {
  return value === null || value === undefined ? null : Number(value);
}

function latestSnapshot(city: CityWithSnapshots) {
  return city.weatherSnapshots.slice().sort((left, right) => right.fetchedAt.getTime() - left.fetchedAt.getTime())[0] ?? null;
}

function serializeWeather(snapshot: WeatherSnapshot | null) {
  if (!snapshot) return null;
  return {
    fetched_at: snapshot.fetchedAt,
    current: {
      temperature: numberOrNull(snapshot.currentTemperature),
      humidity: snapshot.currentHumidity,
      precipitation: numberOrNull(snapshot.currentPrecipitation),
      wind_speed: numberOrNull(snapshot.currentWindSpeed),
      weather_code: snapshot.currentWeatherCode,
      us_aqi: numberOrNull(snapshot.currentUsAqi),
      pm2_5: numberOrNull(snapshot.currentPm25),
      pm10: numberOrNull(snapshot.currentPm10),
    },
    daily: snapshot.dailyData,
  };
}

export function serializeCity(city: CityWithSnapshots, preference: WeatherPreference, includeHistory = false) {
  const snapshot = latestSnapshot(city);
  const scorePreference: WeatherPreferenceLike = preference;
  const breakdown = breakdownFor(scorePreference, snapshot);
  const weights = weightsFor(scorePreference);
  const primary = primaryComponentFor(scorePreference);
  const payload: Record<string, unknown> = {
    id: Number(city.id),
    name: city.name,
    country: city.country,
    country_code: city.countryCode,
    admin1: city.admin1,
    latitude: Number(city.latitude),
    longitude: Number(city.longitude),
    timezone: city.timezone,
    external_id: city.externalId,
    source_name: city.sourceName,
    favorite: city.favorite,
    score: scoreFor(scorePreference, snapshot),
    score_breakdown: breakdown,
    score_weights: weights,
    score_insight: {
      primary_component: primary,
      primary_weight: primary ? weights[primary] : null,
    },
    weather: serializeWeather(snapshot),
    created_at: city.createdAt,
    updated_at: city.updatedAt,
  };
  if (includeHistory) payload.history = historyFor(city.weatherSnapshots, scorePreference);
  return payload;
}

export function serializePreference(preference: WeatherPreference) {
  return {
    id: Number(preference.id),
    target_temperature: Number(preference.targetTemperature),
    temperature_weight: preference.temperatureWeight,
    precipitation_weight: preference.precipitationWeight,
    humidity_weight: preference.humidityWeight,
    wind_weight: preference.windWeight,
    air_quality_weight: preference.airQualityWeight,
    created_at: preference.createdAt,
    updated_at: preference.updatedAt,
  };
}
