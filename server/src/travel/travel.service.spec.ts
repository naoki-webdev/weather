import type { City } from "@prisma/client";

import { PrismaService } from "../prisma.service";
import { WeatherClient } from "../weather/weather.client";
import { RouteClient } from "./route.client";
import { TravelService } from "./travel.service";
import { parseTravelDateTime } from "./timezone";

describe("TravelService", () => {
  it("calculates the arrival time and weather recommendation from a route", async () => {
    const fromId = 1n;
    const toId = 2n;
    const cities = [
      { id: fromId, name: "東京", timezone: "Asia/Tokyo" },
      { id: toId, name: "札幌", timezone: "Asia/Tokyo" },
    ] as Array<Pick<City, "id" | "name" | "timezone">>;
    const prisma = { city: { findMany: jest.fn().mockResolvedValue(cities) } } as unknown as PrismaService;
    const routeClient = { routeFor: jest.fn().mockResolvedValue({ durationSeconds: 2 * 60 * 60 + 30 * 60, distanceMeters: 12345 }) } as unknown as RouteClient;
    const weatherClient = { hourlyWeatherFor: jest.fn().mockResolvedValue({ precipitation_probability: 60, temperature: 25 }) } as unknown as WeatherClient;
    const service = new TravelService(prisma, routeClient, weatherClient);

    const result = await service.plan(99n, fromId, toId, new Date("2026-08-20T00:00:00Z"));

    expect(result).toMatchObject({
      from: { id: 1, name: "東京" },
      to: { id: 2, name: "札幌" },
      mode: "driving",
      departure_at: "2026-08-20T00:00:00.000Z",
      arrival_at: "2026-08-20T02:30:00.000Z",
      duration_minutes: 150,
      distance_km: 12.3,
      arrival_weather: { precipitation_probability: 60, temperature: 25 },
      recommendation: { code: "umbrella" },
    });
    expect(routeClient.routeFor).toHaveBeenCalledWith(cities[0], cities[1]);
    expect(weatherClient.hourlyWeatherFor).toHaveBeenCalledWith(cities[1], new Date("2026-08-20T02:30:00.000Z"));
  });

  it("finds the departure time with the lowest arrival rain probability", async () => {
    const fromId = 1n;
    const toId = 2n;
    const cities = [
      { id: fromId, name: "東京", timezone: "Asia/Tokyo" },
      { id: toId, name: "横浜", timezone: "Asia/Tokyo" },
    ] as Array<Pick<City, "id" | "name" | "timezone">>;
    const prisma = { city: { findMany: jest.fn().mockResolvedValue(cities) } } as unknown as PrismaService;
    const routeClient = { routeFor: jest.fn().mockResolvedValue({ durationSeconds: 42 * 60, distanceMeters: 45000 }) } as unknown as RouteClient;
    const weatherClient = {
      hourlyWeatherFor: jest.fn().mockImplementation(async (_city: City, arrivalAt: Date) => ({
        time: arrivalAt.toISOString(),
        precipitation_probability: arrivalAt.getUTCHours() === 8 ? 70 : 20,
        temperature: 25,
        precipitation: 0,
        wind_speed: 5,
        weather_code: 1,
      })),
    } as unknown as WeatherClient;
    const service = new TravelService(prisma, routeClient, weatherClient);

    const result = await service.bestDeparture(99n, fromId, toId, new Date("2026-08-20T08:00:00.000Z"), new Date("2026-08-20T09:00:00.000Z"), 15);

    expect(result).toMatchObject({
      window_start: "2026-08-20T08:00:00.000Z",
      window_end: "2026-08-20T09:00:00.000Z",
      interval_minutes: 15,
      recommended: {
        departure_at: "2026-08-20T08:30:00.000Z",
        arrival_at: "2026-08-20T09:12:00.000Z",
        weather_score: 80,
      },
      reason: "30分遅らせると到着時の雨を避けやすくなります。",
    });
    expect(routeClient.routeFor).toHaveBeenCalledTimes(1);
    expect(weatherClient.hourlyWeatherFor).toHaveBeenCalledTimes(5);
  });

  it("interprets a local departure time in the origin city's timezone", async () => {
    const fromId = 1n;
    const toId = 2n;
    const cities = [
      { id: fromId, name: "ニューヨーク", timezone: "America/New_York" },
      { id: toId, name: "東京", timezone: "Asia/Tokyo" },
    ] as Array<Pick<City, "id" | "name" | "timezone">>;
    const prisma = { city: { findMany: jest.fn().mockResolvedValue(cities) } } as unknown as PrismaService;
    const routeClient = { routeFor: jest.fn().mockResolvedValue({ durationSeconds: 60, distanceMeters: 1000 }) } as unknown as RouteClient;
    const weatherClient = { hourlyWeatherFor: jest.fn().mockResolvedValue(null) } as unknown as WeatherClient;
    const service = new TravelService(prisma, routeClient, weatherClient);

    const result = await service.plan(99n, fromId, toId, "2026-08-20T09:00");

    expect(result?.departure_at).toBe("2026-08-20T13:00:00.000Z");
    expect(parseTravelDateTime("2026-08-20T09:00", "Asia/Tokyo").toISOString()).toBe("2026-08-20T00:00:00.000Z");
  });

  it("does not recommend a departure when every arrival forecast is unavailable", async () => {
    const fromId = 1n;
    const toId = 2n;
    const cities = [
      { id: fromId, name: "東京", timezone: "Asia/Tokyo" },
      { id: toId, name: "横浜", timezone: "Asia/Tokyo" },
    ] as Array<Pick<City, "id" | "name" | "timezone">>;
    const prisma = { city: { findMany: jest.fn().mockResolvedValue(cities) } } as unknown as PrismaService;
    const routeClient = { routeFor: jest.fn().mockResolvedValue({ durationSeconds: 42 * 60, distanceMeters: 45000 }) } as unknown as RouteClient;
    const weatherClient = { hourlyWeatherFor: jest.fn().mockResolvedValue(null) } as unknown as WeatherClient;
    const service = new TravelService(prisma, routeClient, weatherClient);

    const result = await service.bestDeparture(99n, fromId, toId, new Date("2026-08-20T08:00:00.000Z"), new Date("2026-08-20T08:30:00.000Z"), 15);

    expect(result?.recommended).toBeNull();
    expect(result?.reason).toBe("この時間帯の到着時予報を取得できませんでした。");
    expect(result?.candidates.every((candidate) => candidate.weather_score === null)).toBe(true);
  });
});
