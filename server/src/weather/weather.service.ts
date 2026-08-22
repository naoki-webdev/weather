import { Injectable, Logger } from "@nestjs/common";
import type { City } from "@prisma/client";

import { PrismaService } from "../prisma.service";
import { OpenMeteoRequestError, WeatherClient } from "./weather.client";

const SNAPSHOT_RETENTION_DAYS = 90;
const FRESHNESS_WINDOW_MS = 15 * 60_000;

@Injectable()
export class WeatherService {
  private readonly logger = new Logger(WeatherService.name);
  private syncAllRunning = false;

  constructor(
    private readonly prisma: PrismaService,
    private readonly client: WeatherClient,
  ) {}

  async syncCity(city: City, force = false) {
    const syncStartedAt = new Date();
    const latest = await this.prisma.weatherSnapshot.findFirst({ where: { cityId: city.id }, orderBy: { fetchedAt: "desc" } });
    if (latest && !force && latest.fetchedAt.getTime() >= Date.now() - FRESHNESS_WINDOW_MS) return latest;

    const payload = await this.client.weatherFor(city);
    const forecast = payload.forecast.current as Record<string, unknown> | undefined;
    const airQuality = payload.airQuality.current as Record<string, unknown> | undefined;
    return this.prisma.$transaction(async (database) => {
      // Keep the lock only around the final read/write. External HTTP calls stay outside the transaction.
      await database.$queryRaw`SELECT pg_advisory_xact_lock(${city.id})`;
      const latestAfterFetch = await database.weatherSnapshot.findFirst({ where: { cityId: city.id }, orderBy: { fetchedAt: "desc" } });
      if (latestAfterFetch && latestAfterFetch.fetchedAt >= syncStartedAt) return latestAfterFetch;
      if (latestAfterFetch && !force && latestAfterFetch.fetchedAt.getTime() >= Date.now() - FRESHNESS_WINDOW_MS) return latestAfterFetch;

      return database.weatherSnapshot.create({
        data: {
          cityId: city.id,
          fetchedAt: new Date(),
          currentTemperature: this.numberValue(forecast?.temperature_2m),
          currentHumidity: this.integerValue(forecast?.relative_humidity_2m),
          currentPrecipitation: this.numberValue(forecast?.precipitation),
          currentWindSpeed: this.numberValue(forecast?.wind_speed_10m),
          currentWeatherCode: this.integerValue(forecast?.weather_code),
          currentUsAqi: this.numberValue(airQuality?.us_aqi),
          currentPm25: this.numberValue(airQuality?.pm2_5),
          currentPm10: this.numberValue(airQuality?.pm10),
          dailyData: payload.forecast.daily ?? {},
          sourceName: "Open-Meteo",
        },
      });
    });
  }

  async syncAll() {
    if (this.syncAllRunning) {
      this.logger.debug("Weather sync skipped because a local sync is already running.");
      return false;
    }

    this.syncAllRunning = true;
    try {
      const cities = await this.prisma.city.findMany();
      for (const city of cities) {
        try {
          await this.syncCity(city);
        } catch (error) {
          this.logger.warn(`Weather sync failed for city ${city.id}: ${error instanceof Error ? error.message : String(error)}`);
        }
      }
      await this.pruneSnapshots();
      return true;
    } finally {
      this.syncAllRunning = false;
    }
  }

  private async pruneSnapshots() {
    const cutoff = new Date(Date.now() - SNAPSHOT_RETENTION_DAYS * 24 * 60 * 60_000);
    const result = await this.prisma.weatherSnapshot.deleteMany({ where: { fetchedAt: { lt: cutoff } } });
    if (result.count > 0) this.logger.log(`Pruned ${result.count} weather snapshots older than ${SNAPSHOT_RETENTION_DAYS} days.`);
  }

  private numberValue(value: unknown) {
    if (value === null || value === undefined) return null;
    const numericValue = Number(value);
    return Number.isFinite(numericValue) ? numericValue : null;
  }

  private integerValue(value: unknown) {
    if (value === null || value === undefined) return null;
    const numericValue = Number(value);
    return Number.isFinite(numericValue) ? Math.round(numericValue) : null;
  }
}

export { OpenMeteoRequestError };
