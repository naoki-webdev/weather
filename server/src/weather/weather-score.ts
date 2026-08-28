export const SCORE_COMPONENTS = ["temperature", "precipitation", "humidity", "wind", "air_quality"] as const;
export type ScoreComponent = typeof SCORE_COMPONENTS[number];

export const MAX_SCORE = 100;
const TEMPERATURE_PENALTY_PER_DEGREE = 5;
const IDEAL_HUMIDITY = 50;
const HUMIDITY_PENALTY_PER_PERCENT = 2;
const WIND_PENALTY_PER_KMH = 2.5;
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

function numberValue(value: unknown): number | null {
  if (value === null || value === undefined) return null;
  const numericValue = Number(value);
  return Number.isFinite(numericValue) ? numericValue : null;
}

function firstDailyValue(snapshot: SnapshotLike, key: string): number | null {
  const daily = snapshot.dailyData && typeof snapshot.dailyData === "object"
    ? snapshot.dailyData as Record<string, unknown>
    : {};
  const values = daily[key];
  return Array.isArray(values) ? numberValue(values[0]) : null;
}

function scoreFrom(value: number) {
  return Math.round(Math.max(value, 0));
}

export function breakdownFor(preference: WeatherPreferenceLike, snapshot: SnapshotLike | null) {
  if (!snapshot) return Object.fromEntries(SCORE_COMPONENTS.map((component) => [component, null])) as Record<ScoreComponent, number | null>;

  const temperatureValue = numberValue(snapshot.currentTemperature);
  const targetTemperature = numberValue(preference.targetTemperature);
  const precipitationValue = firstDailyValue(snapshot, "precipitation_probability_max");
  const humidityValue = numberValue(snapshot.currentHumidity);
  const windValue = numberValue(snapshot.currentWindSpeed);
  const airQualityValue = numberValue(snapshot.currentUsAqi);

  const temperature = temperatureValue === null || targetTemperature === null
    ? null
    : scoreFrom(MAX_SCORE - Math.abs(temperatureValue - targetTemperature) * TEMPERATURE_PENALTY_PER_DEGREE);
  const precipitation = precipitationValue === null ? null : scoreFrom(MAX_SCORE - precipitationValue);
  const humidity = humidityValue === null
    ? null
    : scoreFrom(MAX_SCORE - Math.abs(humidityValue - IDEAL_HUMIDITY) * HUMIDITY_PENALTY_PER_PERCENT);
  const wind = windValue === null ? null : scoreFrom(MAX_SCORE - windValue * WIND_PENALTY_PER_KMH);
  const aqi = airQualityValue === null ? null : scoreFrom(MAX_SCORE - airQualityValue);

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
  const availableComponents = SCORE_COMPONENTS.filter((component) => breakdown[component] !== null);
  if (availableComponents.length === 0) return 0;

  const totalWeight = availableComponents.reduce((sum, component) => sum + weights[component], 0);
  if (totalWeight === 0) {
    return Math.round(availableComponents.reduce((sum, component) => sum + breakdown[component]!, 0) / availableComponents.length);
  }
  return Math.round(availableComponents.reduce((sum, component) => sum + breakdown[component]! * weights[component], 0) / totalWeight);
}

export function primaryComponentFor(preference: WeatherPreferenceLike) {
  const weights = weightsFor(preference);
  const maxWeight = Math.max(...Object.values(weights));
  if (maxWeight === 0) return null;
  return SCORE_COMPONENTS.find((component) => weights[component] === maxWeight) ?? null;
}
