import { Prisma, PrismaClient } from "@prisma/client";

import { breakdownFor, MAX_SCORE, scoreFor, type SnapshotLike, type WeatherPreferenceLike } from "./weather-score";
import { scoreSqlFor } from "./weather-score.sql";

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

  it("omits missing components from the weighted score when other weighted values remain", () => {
    const incomplete = snapshot({ currentWindSpeed: null, currentUsAqi: null, dailyData: {} });

    expect(breakdownFor(preference, incomplete)).toMatchObject({
      precipitation: null,
      wind: null,
      air_quality: null,
    });
    expect(scoreFor(preference, incomplete)).toBe(100);
  });

  it("returns an unavailable score when no configured component has data", () => {
    const airQualityOnly = { ...preference, temperatureWeight: 0, precipitationWeight: 0, humidityWeight: 0, windWeight: 0, airQualityWeight: 10 };
    const missingAqi = snapshot({ currentUsAqi: null });

    expect(scoreFor(airQualityOnly, missingAqi)).toBeNull();
  });

  it("returns null for every component when the snapshot is missing", () => {
    expect(breakdownFor(preference, null)).toEqual({
      temperature: null,
      precipitation: null,
      humidity: null,
      wind: null,
      air_quality: null,
    });
    expect(scoreFor(preference, null)).toBeNull();
  });
});

const describeWithDatabase = process.env.DATABASE_URL ? describe : describe.skip;

describeWithDatabase("weather score SQL parity", () => {
  it.each([
    {
      preference: { targetTemperature: 21, temperatureWeight: 5, precipitationWeight: 4, humidityWeight: 2, windWeight: 2, airQualityWeight: 3 },
      snapshot: snapshot({ currentTemperature: 24, currentHumidity: 60, currentWindSpeed: 8, currentUsAqi: 20, dailyData: { precipitation_probability_max: [30] } }),
    },
    {
      preference: { targetTemperature: 30, temperatureWeight: 0, precipitationWeight: 0, humidityWeight: 0, windWeight: 0, airQualityWeight: 0 },
      snapshot: snapshot({ currentTemperature: 18, currentHumidity: null, currentWindSpeed: null, currentUsAqi: null, dailyData: {} }),
    },
  ])("returns the same score as scoreFor for one snapshot", async ({ preference, snapshot: weatherSnapshot }) => {
    const dailyData = weatherSnapshot.dailyData && typeof weatherSnapshot.dailyData === "object"
      ? weatherSnapshot.dailyData as Record<string, unknown>
      : {};
    const precipitation = Array.isArray(dailyData.precipitation_probability_max) ? dailyData.precipitation_probability_max[0] : null;
    const prisma = new PrismaClient();
    try {
      const rows = await prisma.$queryRaw<Array<{ score: number | null }>>(Prisma.sql`
        SELECT ${scoreSqlFor(preference, {
          temperature: Prisma.sql`${weatherSnapshot.currentTemperature}`,
          precipitation: Prisma.sql`${precipitation}`,
          humidity: Prisma.sql`${weatherSnapshot.currentHumidity}`,
          wind: Prisma.sql`${weatherSnapshot.currentWindSpeed}`,
          airQuality: Prisma.sql`${weatherSnapshot.currentUsAqi}`,
        })} AS score
      `);

      expect(rows[0].score === null ? null : Number(rows[0].score)).toBe(scoreFor(preference, weatherSnapshot));
    } finally {
      await prisma.$disconnect();
    }
  });
});
