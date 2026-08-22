import { Injectable } from "@nestjs/common";
import type { Prisma } from "@prisma/client";

import { PrismaService } from "../prisma.service";

export const DEFAULT_PREFERENCE = {
  targetTemperature: 21,
  temperatureWeight: 5,
  precipitationWeight: 4,
  humidityWeight: 2,
  windWeight: 2,
  airQualityWeight: 3,
};

@Injectable()
export class WeatherPreferenceService {
  constructor(private readonly prisma: PrismaService) {}

  async preferenceFor(userId: bigint) {
    return this.prisma.weatherPreference.upsert({
      where: { userId },
      update: {},
      create: { userId, ...DEFAULT_PREFERENCE },
    });
  }

  async updatePreference(userId: bigint, values: Record<string, number>) {
    return this.prisma.$transaction(async (database) => {
      const preference = await database.weatherPreference.upsert({
        where: { userId },
        update: values,
        create: { userId, ...DEFAULT_PREFERENCE, ...values },
      });
      await this.logActivity(userId, "weather_preference.update", "WeatherPreference", preference.id, {}, database);
      return preference;
    });
  }

  private async logActivity(userId: bigint, action: string, resourceType: string, resourceId: bigint, metadata: Prisma.InputJsonValue, database: Pick<PrismaService, "activityLog"> = this.prisma) {
    await database.activityLog.create({ data: { userId, action, resourceType, resourceId, metadata } });
  }
}
