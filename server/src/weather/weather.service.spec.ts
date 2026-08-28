import type { City } from "@prisma/client";

import type { PrismaService } from "../prisma.service";
import type { WeatherClient } from "./weather.client";
import { WeatherService } from "./weather.service";

describe("WeatherService", () => {
  const city = { id: 7n } as City;
  const payload = {
    forecast: { current: {}, daily: {} },
    airQuality: { current: {} },
  };

  it("keeps external requests outside the scheduler transaction and prunes old snapshots", async () => {
    let externalRequestCompleted = false;
    const transactionSnapshot = {
      findFirst: jest.fn().mockResolvedValue(null),
      create: jest.fn().mockResolvedValue({ id: 1n }),
    };
    const prisma = {
      city: { findMany: jest.fn().mockResolvedValue([city]) },
      weatherSnapshot: {
        findFirst: jest.fn().mockResolvedValue(null),
        deleteMany: jest.fn().mockResolvedValue({ count: 3 }),
      },
      $transaction: jest.fn(async (callback: (database: unknown) => unknown) => {
        expect(externalRequestCompleted).toBe(true);
        return callback({
          $queryRaw: jest.fn().mockResolvedValue([]),
          weatherSnapshot: transactionSnapshot,
        });
      }),
      $queryRaw: jest.fn().mockResolvedValue([{ name: "weather-sync" }]),
      $executeRaw: jest.fn().mockResolvedValue(1),
    } as unknown as PrismaService;
    const client = {
      weatherFor: jest.fn().mockImplementation(async () => {
        externalRequestCompleted = true;
        return payload;
      }),
    } as unknown as WeatherClient;
    const service = new WeatherService(prisma, client);

    await expect(service.syncAll()).resolves.toBe(true);

    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    expect(prisma.weatherSnapshot.deleteMany).toHaveBeenCalledWith({ where: { fetchedAt: { lt: expect.any(Date) } } });
    expect(prisma.$queryRaw).toHaveBeenCalledTimes(1);
    expect(prisma.$executeRaw).toHaveBeenCalledTimes(1);
  });

  it("skips a batch when another instance owns the distributed lock", async () => {
    const findMany = jest.fn();
    const prisma = {
      city: { findMany },
      $queryRaw: jest.fn().mockResolvedValue([]),
      $executeRaw: jest.fn(),
    } as unknown as PrismaService;
    const client = {} as WeatherClient;
    const service = new WeatherService(prisma, client);

    await expect(service.syncAll()).resolves.toBe(false);

    expect(findMany).not.toHaveBeenCalled();
    expect(prisma.$executeRaw).not.toHaveBeenCalled();
  });

  it("does not create a duplicate snapshot when another sync finishes first", async () => {
    const latestAfterFetch = { id: 2n, fetchedAt: new Date(Date.now() + 10_000) };
    const transactionSnapshot = {
      findFirst: jest.fn().mockResolvedValue(latestAfterFetch),
      create: jest.fn(),
    };
    const prisma = {
      weatherSnapshot: { findFirst: jest.fn().mockResolvedValue(null) },
      $transaction: jest.fn(async (callback: (database: unknown) => unknown) => callback({
        $queryRaw: jest.fn().mockResolvedValue([]),
        weatherSnapshot: transactionSnapshot,
      })),
    } as unknown as PrismaService;
    const client = { weatherFor: jest.fn().mockResolvedValue(payload) } as unknown as WeatherClient;
    const service = new WeatherService(prisma, client);

    await expect(service.syncCity(city, true)).resolves.toBe(latestAfterFetch);
    expect(transactionSnapshot.create).not.toHaveBeenCalled();
  });
});
