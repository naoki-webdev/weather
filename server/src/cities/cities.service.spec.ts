import type { City } from "@prisma/client";

import type { PrismaService } from "../prisma.service";
import type { WeatherClient } from "../weather/weather.client";
import type { WeatherService } from "../weather/weather.service";
import type { CitiesQueryService } from "./cities.query.service";
import type { WeatherPreferenceService } from "./weather-preference.service";
import { CitiesService } from "./cities.service";

describe("CitiesService activity transactions", () => {
  it("deletes a city and writes its activity log in the same transaction", async () => {
    const city = { id: 7n, name: "東京" } as City;
    type TransactionDatabase = {
      city: { delete: jest.Mock };
      activityLog: { create: jest.Mock };
    };
    const database: TransactionDatabase = {
      city: { delete: jest.fn().mockResolvedValue(city) },
      activityLog: { create: jest.fn().mockResolvedValue(undefined) },
    };
    const prisma = {
      city: { findFirst: jest.fn().mockResolvedValue(city) },
      $transaction: jest.fn(async (callback: (database: TransactionDatabase) => unknown) => callback(database)),
    } as unknown as PrismaService;
    const service = new CitiesService(
      prisma,
      {} as WeatherClient,
      {} as WeatherService,
      {} as CitiesQueryService,
      {} as WeatherPreferenceService,
    );

    await expect(service.remove(99n, city.id)).resolves.toBe(true);

    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    expect(database.city.delete).toHaveBeenCalledWith({ where: { id: city.id } });
    expect(database.activityLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ action: "city.destroy", resourceId: city.id }),
    });
  });
});
