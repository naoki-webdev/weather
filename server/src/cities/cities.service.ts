import { Injectable } from "@nestjs/common";
import type { Prisma } from "@prisma/client";

import { PrismaService } from "../prisma.service";
import { OpenMeteoRequestError, WeatherClient } from "../weather/weather.client";
import { serializeCity } from "../weather/city-serializer";
import { WeatherService } from "../weather/weather.service";
import { CitiesQueryService, LATEST_CITY_INCLUDE } from "./cities.query.service";
import { WeatherPreferenceService } from "./weather-preference.service";

type CityInput = {
  external_id: string;
  name: string;
  country: string;
  country_code: string;
  admin1: string;
  latitude: number;
  longitude: number;
  timezone: string;
  source_name: string;
};

@Injectable()
export class CitiesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly weatherClient: WeatherClient,
    private readonly weatherService: WeatherService,
    private readonly citiesQueryService: CitiesQueryService,
    private readonly weatherPreferenceService: WeatherPreferenceService,
  ) {}

  search(query: string) {
    return this.weatherClient.geocode(query);
  }

  async findOne(userId: bigint, cityId: bigint, includeHistory = false) {
    let city = await this.prisma.city.findFirst({ where: { id: cityId, userId }, include: LATEST_CITY_INCLUDE });
    if (!city) return null;
    if (includeHistory) city = (await this.citiesQueryService.withHistory([city]))[0];
    return serializeCity(city, await this.weatherPreferenceService.preferenceFor(userId), includeHistory);
  }

  async upsert(userId: bigint, input: CityInput) {
    const data = {
      name: input.name,
      country: input.country,
      countryCode: input.country_code,
      admin1: input.admin1,
      latitude: input.latitude,
      longitude: input.longitude,
      timezone: input.timezone,
      sourceName: input.source_name,
    };
    const existing = await this.prisma.city.findUnique({ where: { userId_externalId: { userId, externalId: input.external_id } } });
    const city = await this.prisma.city.upsert({
      where: { userId_externalId: { userId, externalId: input.external_id } },
      create: { userId, externalId: input.external_id, ...data },
      update: data,
      include: LATEST_CITY_INCLUDE,
    });
    let syncError: string | null = null;
    try {
      await this.weatherService.syncCity(city, true);
    } catch (error) {
      if (!(error instanceof OpenMeteoRequestError)) throw error;
      syncError = error.message;
    }

    await this.logActivity(userId, existing ? "city.update" : "city.create", "City", city.id, { name: city.name });
    const updated = await this.prisma.city.findUniqueOrThrow({ where: { id: city.id }, include: LATEST_CITY_INCLUDE });
    const [updatedWithHistory] = await this.citiesQueryService.withHistory([updated]);
    return { city: serializeCity(updatedWithHistory, await this.weatherPreferenceService.preferenceFor(userId), true), syncError };
  }

  async remove(userId: bigint, cityId: bigint) {
    const city = await this.prisma.city.findFirst({ where: { id: cityId, userId } });
    if (!city) return false;
    await this.logActivity(userId, "city.destroy", "City", city.id, { name: city.name });
    await this.prisma.city.delete({ where: { id: city.id } });
    return true;
  }

  async sync(userId: bigint, cityId: bigint) {
    const city = await this.prisma.city.findFirst({ where: { id: cityId, userId } });
    if (!city) return null;
    await this.weatherService.syncCity(city, true);
    return this.findOne(userId, cityId, true);
  }

  async favorite(userId: bigint, cityId: bigint, favorite: boolean) {
    const city = await this.prisma.city.findFirst({ where: { id: cityId, userId }, include: LATEST_CITY_INCLUDE });
    if (!city) return null;
    const updated = await this.prisma.city.update({ where: { id: city.id }, data: { favorite }, include: LATEST_CITY_INCLUDE });
    await this.logActivity(userId, "city.favorite", "City", city.id, { favorite });
    return serializeCity(updated, await this.weatherPreferenceService.preferenceFor(userId));
  }

  private async logActivity(userId: bigint, action: string, resourceType: string, resourceId: bigint, metadata: Prisma.InputJsonValue) {
    await this.prisma.activityLog.create({ data: { userId, action, resourceType, resourceId, metadata } });
  }
}
