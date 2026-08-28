import { Injectable, Logger } from "@nestjs/common";
import type { City } from "@prisma/client";
import { randomUUID } from "node:crypto";

import { PrismaService } from "../prisma.service";
import { OpenMeteoRequestError, WeatherClient } from "./weather.client";

const SNAPSHOT_RETENTION_DAYS = 90;
const FRESHNESS_WINDOW_MS = 15 * 60_000;
const WEATHER_SYNC_LOCK_NAME = "weather-sync";
const WEATHER_SYNC_LOCK_RENEWAL_MS = 5 * 60_000;

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
    const lockOwner = randomUUID();
    try {
      if (!(await this.acquireSyncLock(lockOwner))) {
        this.logger.debug("Weather sync skipped because another instance holds the distributed lock.");
        return false;
      }

      try {
        const lockRenewal = setInterval(() => {
          void this.renewSyncLock(lockOwner);
        }, WEATHER_SYNC_LOCK_RENEWAL_MS);
        lockRenewal.unref?.();
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
          clearInterval(lockRenewal);
        }
      } finally {
        await this.releaseSyncLock(lockOwner);
      }
    } finally {
      this.syncAllRunning = false;
    }
  }

  private async acquireSyncLock(owner: string) {
    const rows = await this.prisma.$queryRaw<Array<{ name: string }>>`
      INSERT INTO "weather_sync_locks" ("name", "owner", "locked_until", "created_at", "updated_at")
      VALUES (${WEATHER_SYNC_LOCK_NAME}, ${owner}, CURRENT_TIMESTAMP + INTERVAL '2 hours', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      ON CONFLICT ("name") DO UPDATE
      SET "owner" = EXCLUDED."owner",
          "locked_until" = EXCLUDED."locked_until",
          "updated_at" = CURRENT_TIMESTAMP
      WHERE "weather_sync_locks"."locked_until" <= CURRENT_TIMESTAMP
      RETURNING "name"
    `;
    return rows.length > 0;
  }

  private async renewSyncLock(owner: string) {
    try {
      const updated = await this.prisma.$executeRaw`
        UPDATE "weather_sync_locks"
        SET "locked_until" = CURRENT_TIMESTAMP + INTERVAL '2 hours', "updated_at" = CURRENT_TIMESTAMP
        WHERE "name" = ${WEATHER_SYNC_LOCK_NAME} AND "owner" = ${owner}
      `;
      if (updated !== 1) this.logger.warn("Weather sync lock renewal did not update the lock owner.");
    } catch (error) {
      this.logger.warn(`Failed to renew the weather sync lock: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  private async releaseSyncLock(owner: string) {
    try {
      await this.prisma.$executeRaw`
        DELETE FROM "weather_sync_locks"
        WHERE "name" = ${WEATHER_SYNC_LOCK_NAME} AND "owner" = ${owner}
      `;
    } catch (error) {
      this.logger.error(`Failed to release the weather sync lock: ${error instanceof Error ? error.message : String(error)}`);
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
