import { breakdownFor, MAX_SCORE, scoreFor, type SnapshotLike, type WeatherPreferenceLike } from "./weather-score";

const preference: WeatherPreferenceLike = {
  targetTemperature: 21,
  temperatureWeight: 5,
  precipitationWeight: 4,
  humidityWeight: 2,
  windWeight: 2,
  airQualityWeight: 3,
};

function snapshot(overrides: Partial<SnapshotLike> = {}): SnapshotLike {
  return {
    currentTemperature: 21,
    currentPrecipitation: 0,
    currentHumidity: 50,
    currentWindSpeed: 0,
    currentUsAqi: 0,
    dailyData: { precipitation_probability_max: [0] },
    ...overrides,
  };
}

describe("weather score", () => {
  it("returns the maximum component scores for ideal conditions", () => {
    expect(breakdownFor(preference, snapshot())).toEqual({
      temperature: MAX_SCORE,
      precipitation: MAX_SCORE,
      humidity: MAX_SCORE,
      wind: MAX_SCORE,
      air_quality: MAX_SCORE,
    });
  });

  it("reduces the precipitation score to zero at 100 percent probability", () => {
    const breakdown = breakdownFor(preference, snapshot({ dailyData: { precipitation_probability_max: [100] } }));

    expect(breakdown.precipitation).toBe(0);
  });

  it("applies preference weights to the overall score", () => {
    const weightedPreference = { ...preference, temperatureWeight: 10, precipitationWeight: 0, humidityWeight: 0, windWeight: 0, airQualityWeight: 0 };

    expect(scoreFor(weightedPreference, snapshot({ currentTemperature: 31 }))).toBe(50);
  });

  it("omits missing components from the weighted score", () => {
    const incomplete = snapshot({ currentWindSpeed: null, currentUsAqi: null, dailyData: {} });

    expect(breakdownFor(preference, incomplete)).toMatchObject({
      precipitation: null,
      wind: null,
      air_quality: null,
    });
    expect(scoreFor(preference, incomplete)).toBe(100);
  });

  it("returns null for every component when the snapshot is missing", () => {
    expect(breakdownFor(preference, null)).toEqual({
      temperature: null,
      precipitation: null,
      humidity: null,
      wind: null,
      air_quality: null,
    });
    expect(scoreFor(preference, null)).toBe(0);
  });
});
