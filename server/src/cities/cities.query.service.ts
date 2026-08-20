import { Injectable } from "@nestjs/common";
import type { WeatherPreference } from "@prisma/client";

import { PrismaService } from "../prisma.service";
import { serializeCity, type CityWithSnapshots } from "../weather/city-serializer";
import { historyRange, PERIOD_DAYS } from "../weather/weather-history";
import { scoreFor } from "../weather/weather-score";
import { WeatherPreferenceService } from "./weather-preference.service";

export const LATEST_CITY_INCLUDE = {
  weatherSnapshots: { orderBy: { fetchedAt: "desc" as const }, take: 1 },
};

@Injectable()
export class CitiesQueryService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly weatherPreferenceService: WeatherPreferenceService,
  ) {}

  async list(userId: bigint, params: Record<string, string | undefined>) {
    const preference = await this.weatherPreferenceService.preferenceFor(userId);
    const page = Math.max(Number(params.page) || 1, 1);
    const perPage = Math.min(Math.max(Number(params.per_page) || 20, 1), 100);
    const keyword = (params.keyword ?? "").trim().toLowerCase();
    const favoriteOnly = params.favorites_only === "true";
    const cities = await this.prisma.city.findMany({
      where: {
        userId,
        ...(favoriteOnly ? { favorite: true } : {}),
        ...(keyword ? {
          OR: [
            { name: { contains: keyword, mode: "insensitive" as const } },
            { country: { contains: keyword, mode: "insensitive" as const } },
            { admin1: { contains: keyword, mode: "insensitive" as const } },
            { countryCode: { contains: keyword, mode: "insensitive" as const } },
          ],
        } : {}),
      },
      include: LATEST_CITY_INCLUDE,
    });
    const filtered = cities.filter((city) => !keyword || [city.name, city.country, city.admin1, city.countryCode].some((value) => value.toLowerCase().includes(keyword)));
    const ordered = this.sortCities(filtered, preference, params.sort, params.direction);
    const snapshots = filtered.map((city) => city.weatherSnapshots[0]).filter(Boolean);
    const temperatures = snapshots.map((snapshot) => this.numberOrNull(snapshot.currentTemperature)).filter((value): value is number => value !== null);

    return {
      cities: ordered.slice((page - 1) * perPage, page * perPage).map((city) => serializeCity(city, preference)),
      meta: {
        page,
        per_page: perPage,
        total_count: filtered.length,
        summary: {
          recommended: filtered.filter((city) => scoreFor(preference, city.weatherSnapshots[0] ?? null) >= 70).length,
          average_temperature: temperatures.length ? this.average(temperatures) : null,
          refreshed: snapshots.length,
        },
      },
    };
  }

  async compare(userId: bigint, ids: bigint[]) {
    const uniqueIds = [...new Set(ids)];
    if (uniqueIds.length < 2 || uniqueIds.length > 4) throw new Error("比較する都市を2～4件選択してください。");

    const cities = await this.prisma.city.findMany({ where: { userId, id: { in: uniqueIds } }, include: LATEST_CITY_INCLUDE });
    if (cities.length !== uniqueIds.length) throw new Error("比較対象の都市が見つかりません。");
    const citiesWithHistory = await this.withHistory(cities);

    const preference = await this.weatherPreferenceService.preferenceFor(userId);
    const scores = new Map(citiesWithHistory.map((city) => [city.id, scoreFor(preference, city.weatherSnapshots[0] ?? null)]));
    const leaderId = uniqueIds.slice().sort((left, right) => (scores.get(right) ?? 0) - (scores.get(left) ?? 0))[0] ?? null;
    const averageScore = this.average([...scores.values()]);

    return {
      cities: uniqueIds.map((id) => citiesWithHistory.find((city) => city.id === id)!).map((city) => serializeCity(city, preference, true)),
      meta: { count: citiesWithHistory.length, leader_id: leaderId === null ? null : Number(leaderId), average_score: averageScore, history_period_days: PERIOD_DAYS },
    };
  }

  async filteredCities(userId: bigint, params: Record<string, string | undefined>): Promise<CityWithSnapshots[]> {
    const cities = await this.prisma.city.findMany({ where: { userId, ...(params.favorites_only === "true" ? { favorite: true } : {}) }, include: LATEST_CITY_INCLUDE });
    const keyword = (params.keyword ?? "").trim().toLowerCase();
    const preference = await this.weatherPreferenceService.preferenceFor(userId);
    return this.sortCities(cities.filter((city) => !keyword || [city.name, city.country, city.admin1, city.countryCode].some((value) => value.toLowerCase().includes(keyword))), preference, params.sort, params.direction);
  }

  async withHistory<T extends CityWithSnapshots>(cities: T[], now = new Date()): Promise<T[]> {
    if (cities.length === 0) return cities;
    const { from, to } = historyRange(now);
    const snapshots = await this.prisma.weatherSnapshot.findMany({
      where: { cityId: { in: cities.map((city) => city.id) }, fetchedAt: { gte: from, lte: to } },
      orderBy: { fetchedAt: "desc" },
    });
    const snapshotsByCity = new Map<bigint, typeof snapshots>();
    snapshots.forEach((snapshot) => {
      const citySnapshots = snapshotsByCity.get(snapshot.cityId) ?? [];
      citySnapshots.push(snapshot);
      snapshotsByCity.set(snapshot.cityId, citySnapshots);
    });

    return cities.map((city) => {
      const latest = city.weatherSnapshots[0];
      const combined = latest ? [latest, ...(snapshotsByCity.get(city.id) ?? [])] : snapshotsByCity.get(city.id) ?? [];
      const uniqueSnapshots = [...new Map(combined.map((snapshot) => [snapshot.id.toString(), snapshot])).values()];
      return { ...city, weatherSnapshots: uniqueSnapshots } as T;
    });
  }

  private sortCities(cities: CityWithSnapshots[], preference: WeatherPreference, sort: string | undefined, direction: string | undefined) {
    const key = ["name", "score", "updated_at", "temperature"].includes(sort ?? "") ? sort : "score";
    const descending = direction === "asc" ? false : true;
    return cities.slice().sort((left, right) => {
      const leftValue = this.sortValue(left, preference, key!);
      const rightValue = this.sortValue(right, preference, key!);
      if (leftValue === rightValue) return left.id < right.id ? -1 : left.id > right.id ? 1 : 0;
      if (typeof leftValue === "string" && typeof rightValue === "string") return descending ? rightValue.localeCompare(leftValue) : leftValue.localeCompare(rightValue);
      return descending ? Number(rightValue) - Number(leftValue) : Number(leftValue) - Number(rightValue);
    });
  }

  private sortValue(city: CityWithSnapshots, preference: WeatherPreference, key: string) {
    if (key === "name") return city.name.toLowerCase();
    if (key === "temperature") return this.numberOrNull(city.weatherSnapshots[0]?.currentTemperature) ?? Number.NEGATIVE_INFINITY;
    if (key === "updated_at") return city.updatedAt.getTime();
    return scoreFor(preference, city.weatherSnapshots[0] ?? null);
  }

  private average(values: number[]) {
    return values.length ? Math.round((values.reduce((sum, value) => sum + value, 0) / values.length) * 10) / 10 : 0;
  }

  private numberOrNull(value: unknown) {
    return value === null || value === undefined ? null : Number(value);
  }
}
