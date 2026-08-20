import { Prisma } from "@prisma/client";

import { ForecastOutOfRangeError, WeatherClient } from "./weather.client";

describe("WeatherClient hourly forecast", () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  const city = {
    externalId: "seed-tokyo",
    latitude: new Prisma.Decimal(35.6762),
    longitude: new Prisma.Decimal(139.6503),
  };

  const hourlyPayload = {
    hourly: {
      time: ["2026-08-20T00:00", "2026-08-20T01:00"],
      temperature_2m: [24, 25],
      precipitation_probability: [10, 60],
      precipitation: [0, 0.2],
      wind_speed_10m: [5, 7],
      weather_code: [1, 61],
    },
  };

  it("returns the hourly forecast closest to the arrival time", async () => {
    jest.spyOn(global, "fetch").mockResolvedValue({
      ok: true,
      json: async () => hourlyPayload,
    } as Response);

    const result = await new WeatherClient().hourlyWeatherFor(city, new Date("2026-08-20T00:40:00Z"));

    expect(result).toEqual({
      time: "2026-08-20T01:00",
      temperature: 25,
      precipitation_probability: 60,
      precipitation: 0.2,
      wind_speed: 7,
      weather_code: 61,
    });
  });

  it("rejects arrival times outside the hourly forecast range", async () => {
    jest.spyOn(global, "fetch").mockResolvedValue({
      ok: true,
      json: async () => hourlyPayload,
    } as Response);

    await expect(new WeatherClient().hourlyWeatherFor(city, new Date("2026-08-20T02:00:00Z")))
      .rejects
      .toBeInstanceOf(ForecastOutOfRangeError);
  });
});
