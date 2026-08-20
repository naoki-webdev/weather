import { Injectable, Logger } from "@nestjs/common";
import type { City } from "@prisma/client";

import { PrismaService } from "../prisma.service";
import { OpenMeteoRequestError, WeatherClient } from "./weather.client";

const WEATHER_SYNC_LOCK_KEY = 9042847561n;
type SnapshotRepository = Pick<PrismaService, "weatherSnapshot">;

@Injectable()
export class WeatherService {
  private readonly logger = new Logger(WeatherService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly client: WeatherClient,
  ) {}

  async syncCity(city: City, force = false, database: SnapshotRepository = this.prisma) {
    const latest = await database.weatherSnapshot.findFirst({ where: { cityId: city.id }, orderBy: { fetchedAt: "desc" } });
    if (latest && !force && latest.fetchedAt.getTime() >= Date.now() - 15 * 60_000) return latest;

    const payload = await this.client.weatherFor(city);
    const forecast = payload.forecast.current as Record<string, unknown> | undefined;
    const airQuality = payload.airQuality.current as Record<string, unknown> | undefined;
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
  }

  async syncAll() {
    return this.prisma.$transaction(async (database) => {
      const lock = await database.$queryRaw<Array<{ locked: boolean }>>`
        SELECT pg_try_advisory_xact_lock(${WEATHER_SYNC_LOCK_KEY}) AS locked
      `;
      if (!lock[0]?.locked) {
        this.logger.debug("Weather sync skipped because another instance owns the scheduler lock.");
        return false;
      }

      const cities = await database.city.findMany();
      for (const city of cities) {
        try {
          await this.syncCity(city, false, database);
        } catch (error) {
          this.logger.warn(`Weather sync failed for city ${city.id}: ${error instanceof Error ? error.message : String(error)}`);
        }
      }
      return true;
    });
  }

  private numberValue(value: unknown) {
    return value === null || value === undefined ? null : Number(value);
  }

  private integerValue(value: unknown) {
    return value === null || value === undefined ? null : Math.round(Number(value));
  }
}

export { OpenMeteoRequestError };
