import type { WeatherPreferenceLike, SnapshotLike } from "./weather-score";
import { scoreFor } from "./weather-score";

export const PERIOD_DAYS = 30;

export function historyRange(now = new Date()) {
  return {
    from: new Date(now.getTime() - PERIOD_DAYS * 24 * 60 * 60 * 1000),
    to: now,
  };
}

function average(values: number[]) {
  return values.length === 0 ? null : Math.round((values.reduce((sum, value) => sum + value, 0) / values.length) * 10) / 10;
}

function numberOrNull(value: unknown) {
  return value === null || value === undefined ? null : Number(value);
}

export function historyFor(
  snapshots: Array<SnapshotLike & { fetchedAt: Date }>,
  preference: WeatherPreferenceLike,
  now = new Date(),
) {
  const { from, to } = historyRange(now);
  const period = snapshots.filter((snapshot) => snapshot.fetchedAt >= from && snapshot.fetchedAt <= to).sort((left, right) => left.fetchedAt.getTime() - right.fetchedAt.getTime());
  if (period.length === 0) return null;

  const latest = snapshots.reduce<typeof snapshots[number] | undefined>((current, snapshot) => {
    if (!current || snapshot.fetchedAt > current.fetchedAt) return snapshot;
    return current;
  }, undefined);
  const scores = period.map((snapshot) => scoreFor(preference, snapshot));
  const averageScore = average(scores);
  const currentScore = latest ? scoreFor(preference, latest) : null;

  return {
    period_days: PERIOD_DAYS,
    from: period[0].fetchedAt,
    to: period[period.length - 1].fetchedAt,
    snapshot_count: period.length,
    average_score: averageScore,
    current_score: currentScore,
    score_delta: currentScore !== null && averageScore !== null ? Math.round((currentScore - averageScore) * 10) / 10 : null,
    averages: {
      temperature: average(period.map((snapshot) => numberOrNull(snapshot.currentTemperature)).filter((value): value is number => value !== null)),
      humidity: average(period.map((snapshot) => numberOrNull(snapshot.currentHumidity)).filter((value): value is number => value !== null)),
      precipitation: average(period.map((snapshot) => numberOrNull((snapshot as { currentPrecipitation?: unknown }).currentPrecipitation)).filter((value): value is number => value !== null)),
      wind_speed: average(period.map((snapshot) => numberOrNull(snapshot.currentWindSpeed)).filter((value): value is number => value !== null)),
      us_aqi: average(period.map((snapshot) => numberOrNull(snapshot.currentUsAqi)).filter((value): value is number => value !== null)),
    },
  };
}
