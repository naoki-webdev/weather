import { historyFor } from "./weather-history";

describe("historyFor", () => {
  it("only aggregates snapshots from the latest 30 days", () => {
    const now = new Date("2026-08-21T12:00:00.000Z");
    const snapshot = (fetchedAt: string, temperature: number) => ({
      fetchedAt: new Date(fetchedAt),
      currentTemperature: temperature,
      currentPrecipitation: 0,
      currentHumidity: 50,
      currentWindSpeed: 0,
      currentUsAqi: 0,
      dailyData: { precipitation_probability_max: [0] },
    });

    const result = historyFor([
      snapshot("2026-07-20T12:00:00.000Z", 0),
      snapshot("2026-08-20T12:00:00.000Z", 20),
      snapshot("2026-08-21T12:00:00.000Z", 22),
    ], {
      targetTemperature: 21,
      temperatureWeight: 1,
      precipitationWeight: 1,
      humidityWeight: 1,
      windWeight: 1,
      airQualityWeight: 1,
    }, now);

    expect(result?.snapshot_count).toBe(2);
    expect(result?.averages.temperature).toBe(21);
  });
});
