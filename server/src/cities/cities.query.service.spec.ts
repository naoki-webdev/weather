import type { WeatherPreference } from "@prisma/client";

import type { PrismaService } from "../prisma.service";
import { CitiesQueryService } from "./cities.query.service";
import type { WeatherPreferenceService } from "./weather-preference.service";

describe("CitiesQueryService", () => {
  it("sorts the displayed updated_at value by the latest weather snapshot", async () => {
    const preference = {
      targetTemperature: 21,
      temperatureWeight: 1,
      precipitationWeight: 1,
      humidityWeight: 1,
      windWeight: 1,
      airQualityWeight: 1,
    } as unknown as WeatherPreference;
    const snapshot = (id: bigint, cityId: bigint, fetchedAt: string) => ({
      id,
      cityId,
      fetchedAt: new Date(fetchedAt),
      currentTemperature: 20,
      currentHumidity: 50,
      currentPrecipitation: 0,
      currentWindSpeed: 2,
      currentWeatherCode: 1,
      currentUsAqi: 20,
      currentPm25: null,
      currentPm10: null,
      dailyData: { precipitation_probability_max: [0] },
      sourceName: "Open-Meteo",
      createdAt: new Date(fetchedAt),
      updatedAt: new Date(fetchedAt),
    });
    const city = (id: bigint, name: string, cityUpdatedAt: string, weatherFetchedAt: string) => ({
      id,
      name,
      country: "日本",
      countryCode: "JP",
      admin1: "",
      latitude: 35,
      longitude: 139,
      timezone: "Asia/Tokyo",
      externalId: name,
      sourceName: "Open-Meteo",
      favorite: false,
      createdAt: new Date("2026-08-01T00:00:00.000Z"),
      updatedAt: new Date(cityUpdatedAt),
      weatherSnapshots: [snapshot(id * 10n, id, weatherFetchedAt)],
    });
    const cities = [
      city(1n, "東京", "2026-08-28T20:00:00.000Z", "2026-08-28T22:00:00.000Z"),
      city(2n, "大阪", "2026-08-28T23:00:00.000Z", "2026-08-28T21:00:00.000Z"),
    ];
    const prisma = {
      city: {
        count: jest.fn().mockResolvedValue(cities.length),
        findMany: jest.fn().mockResolvedValue(cities),
      },
      $queryRaw: jest.fn()
        .mockResolvedValueOnce([{ recommended: 1, average_temperature: 20, refreshed: 2 }])
        .mockResolvedValueOnce([{ id: 1n }, { id: 2n }]),
    } as unknown as PrismaService;
    const weatherPreferenceService = { preferenceFor: jest.fn().mockResolvedValue(preference) } as unknown as WeatherPreferenceService;
    const service = new CitiesQueryService(prisma, weatherPreferenceService);

    const result = await service.list(99n, { sort: "updated_at", direction: "desc" });

    expect(result.cities.map((city) => city.id)).toEqual([1, 2]);
  });

  it("uses database pagination for name sorting", async () => {
    const preference = {
      targetTemperature: 21,
      temperatureWeight: 1,
      precipitationWeight: 1,
      humidityWeight: 1,
      windWeight: 1,
      airQualityWeight: 1,
    } as unknown as WeatherPreference;
    const city = {
      id: 2n,
      name: "大阪",
      country: "日本",
      countryCode: "JP",
      admin1: "大阪府",
      latitude: 34,
      longitude: 135,
      timezone: "Asia/Tokyo",
      externalId: "osaka",
      sourceName: "Open-Meteo",
      favorite: false,
      createdAt: new Date("2026-08-01T00:00:00.000Z"),
      updatedAt: new Date("2026-08-01T00:00:00.000Z"),
      weatherSnapshots: [],
    };
    const findMany = jest.fn().mockResolvedValue([city]);
    const prisma = {
      city: { count: jest.fn().mockResolvedValue(2), findMany },
      $queryRaw: jest.fn().mockResolvedValue([{ recommended: 1, average_temperature: 20, refreshed: 2 }]),
    } as unknown as PrismaService;
    const weatherPreferenceService = { preferenceFor: jest.fn().mockResolvedValue(preference) } as unknown as WeatherPreferenceService;
    const service = new CitiesQueryService(prisma, weatherPreferenceService);

    await service.list(99n, { sort: "name", direction: "asc", page: "2", per_page: "1" });

    expect(findMany).toHaveBeenCalledWith(expect.objectContaining({
      orderBy: [{ name: "asc" }, { id: "asc" }],
      skip: 1,
      take: 1,
    }));
    expect(findMany).toHaveBeenCalledTimes(1);
  });

  it("uses database pagination for temperature sorting", async () => {
    const preference = {
      targetTemperature: 21,
      temperatureWeight: 1,
      precipitationWeight: 1,
      humidityWeight: 1,
      windWeight: 1,
      airQualityWeight: 1,
    } as unknown as WeatherPreference;
    const city = {
      id: 2n,
      name: "大阪",
      country: "日本",
      countryCode: "JP",
      admin1: "大阪府",
      latitude: 34,
      longitude: 135,
      timezone: "Asia/Tokyo",
      externalId: "osaka",
      sourceName: "Open-Meteo",
      favorite: false,
      createdAt: new Date("2026-08-01T00:00:00.000Z"),
      updatedAt: new Date("2026-08-01T00:00:00.000Z"),
      weatherSnapshots: [],
    };
    const findMany = jest.fn().mockResolvedValue([city]);
    const queryRaw = jest.fn()
      .mockResolvedValueOnce([{ recommended: 1, average_temperature: 20, refreshed: 2 }])
      .mockResolvedValueOnce([{ id: 2n }]);
    const prisma = {
      city: { count: jest.fn().mockResolvedValue(2), findMany },
      $queryRaw: queryRaw,
    } as unknown as PrismaService;
    const weatherPreferenceService = { preferenceFor: jest.fn().mockResolvedValue(preference) } as unknown as WeatherPreferenceService;
    const service = new CitiesQueryService(prisma, weatherPreferenceService);

    await service.list(99n, { sort: "temperature", direction: "desc", page: "2", per_page: "1" });

    expect(queryRaw).toHaveBeenCalledTimes(2);
    const pageQuery = queryRaw.mock.calls[1][0] as { sql: string };
    expect(pageQuery.sql).toContain('SELECT snapshot."fetched_at", snapshot."current_temperature"');
    expect(findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { userId: 99n, id: { in: [2n] } },
    }));
  });
});
