import type { PrismaService } from "../prisma.service";
import { WeatherPreferenceService } from "./weather-preference.service";

describe("WeatherPreferenceService activity transactions", () => {
  it("updates the preference and writes its activity log in the same transaction", async () => {
    const preference = { id: 11n };
    type TransactionDatabase = {
      weatherPreference: { upsert: jest.Mock };
      activityLog: { create: jest.Mock };
    };
    const database: TransactionDatabase = {
      weatherPreference: { upsert: jest.fn().mockResolvedValue(preference) },
      activityLog: { create: jest.fn().mockResolvedValue(undefined) },
    };
    const prisma = {
      $transaction: jest.fn(async (callback: (database: TransactionDatabase) => unknown) => callback(database)),
    } as unknown as PrismaService;
    const service = new WeatherPreferenceService(prisma);

    await expect(service.updatePreference(99n, { temperatureWeight: 6 })).resolves.toBe(preference);

    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    expect(database.weatherPreference.upsert).toHaveBeenCalled();
    expect(database.activityLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ action: "weather_preference.update", resourceId: preference.id }),
    });
  });
});
