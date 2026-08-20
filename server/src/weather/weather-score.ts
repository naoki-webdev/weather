export const SCORE_COMPONENTS = ["temperature", "precipitation", "humidity", "wind", "air_quality"] as const;
export type ScoreComponent = typeof SCORE_COMPONENTS[number];

export const MAX_SCORE = 100;
const TEMPERATURE_PENALTY_PER_DEGREE = 5;
const IDEAL_HUMIDITY = 50;
const HUMIDITY_PENALTY_PER_PERCENT = 2;
const WIND_PENALTY_PER_KMH = 2.5;
const DEFAULT_AIR_QUALITY_SCORE = 70;

export type WeatherPreferenceLike = {
  targetTemperature: unknown;
  temperatureWeight: number;
  precipitationWeight: number;
  humidityWeight: number;
  windWeight: number;
  airQualityWeight: number;
};

export type SnapshotLike = {
  currentTemperature: unknown;
  currentPrecipitation: unknown;
  currentHumidity: number | null;
  currentWindSpeed: unknown;
  currentUsAqi: unknown;
  dailyData: unknown;
};

function numberValue(value: unknown) {
  return value === null || value === undefined ? 0 : Number(value);
}

function firstDailyValue(snapshot: SnapshotLike, key: string) {
  const daily = snapshot.dailyData && typeof snapshot.dailyData === "object"
    ? snapshot.dailyData as Record<string, unknown>
    : {};
  const values = daily[key];
  return Array.isArray(values) ? Number(values[0] ?? 0) : 0;
}

function scoreFrom(value: number) {
  return Math.round(Math.max(value, 0));
}

export function breakdownFor(preference: WeatherPreferenceLike, snapshot: SnapshotLike | null) {
  if (!snapshot) return Object.fromEntries(SCORE_COMPONENTS.map((component) => [component, 0])) as Record<ScoreComponent, number>;

  const temperature = scoreFrom(MAX_SCORE - Math.abs(numberValue(snapshot.currentTemperature) - numberValue(preference.targetTemperature)) * TEMPERATURE_PENALTY_PER_DEGREE);
  const precipitation = scoreFrom(MAX_SCORE - firstDailyValue(snapshot, "precipitation_probability_max"));
  const humidity = scoreFrom(MAX_SCORE - Math.abs(numberValue(snapshot.currentHumidity) - IDEAL_HUMIDITY) * HUMIDITY_PENALTY_PER_PERCENT);
  const wind = scoreFrom(MAX_SCORE - numberValue(snapshot.currentWindSpeed) * WIND_PENALTY_PER_KMH);
  const aqi = snapshot.currentUsAqi === null || snapshot.currentUsAqi === undefined
    ? DEFAULT_AIR_QUALITY_SCORE
    : scoreFrom(MAX_SCORE - numberValue(snapshot.currentUsAqi));

  return {
    temperature,
    precipitation,
    humidity,
    wind,
    air_quality: aqi,
  };
}

export function weightsFor(preference: WeatherPreferenceLike) {
  return {
    temperature: Number(preference.temperatureWeight),
    precipitation: Number(preference.precipitationWeight),
    humidity: Number(preference.humidityWeight),
    wind: Number(preference.windWeight),
    air_quality: Number(preference.airQualityWeight),
  } satisfies Record<ScoreComponent, number>;
}

export function scoreFor(preference: WeatherPreferenceLike, snapshot: SnapshotLike | null) {
  const breakdown = breakdownFor(preference, snapshot);
  const weights = weightsFor(preference);
  const totalWeight = Object.values(weights).reduce((sum, weight) => sum + weight, 0);
  if (totalWeight === 0) return Math.round(Object.values(breakdown).reduce((sum, score) => sum + score, 0) / SCORE_COMPONENTS.length);
  return Math.round(SCORE_COMPONENTS.reduce((sum, component) => sum + breakdown[component] * weights[component], 0) / totalWeight);
}

export function primaryComponentFor(preference: WeatherPreferenceLike) {
  const weights = weightsFor(preference);
  const maxWeight = Math.max(...Object.values(weights));
  if (maxWeight === 0) return null;
  return SCORE_COMPONENTS.find((component) => weights[component] === maxWeight) ?? null;
}
