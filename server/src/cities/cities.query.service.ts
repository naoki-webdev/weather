import { Injectable } from "@nestjs/common";
import { Prisma, type WeatherPreference } from "@prisma/client";

import { PrismaService } from "../prisma.service";
import { serializeCity, type CityWithSnapshots } from "../weather/city-serializer";
import { historyRange, PERIOD_DAYS } from "../weather/weather-history";
import { scoreFor } from "../weather/weather-score";
import { WeatherPreferenceService } from "./weather-preference.service";
import { CityComparisonInputError, CityComparisonNotFoundError } from "./cities.errors";

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
    const where = this.cityWhere(userId, keyword, favoriteOnly);
    const key = this.sortKey(params.sort);
    const descending = params.direction !== "asc";
    const direction = descending ? ("desc" as const) : ("asc" as const);
    const totalCount = await this.prisma.city.count({ where });
    const summary = await this.summaryFor(userId, keyword, favoriteOnly, preference);
    const allCities = key === "score"
      ? await this.prisma.city.findMany({ where, include: LATEST_CITY_INCLUDE })
      : null;
    const pageCities = key === "name"
      ? await this.prisma.city.findMany({
        where,
        include: LATEST_CITY_INCLUDE,
        orderBy: [{ name: direction }, { id: "asc" }],
        skip: (page - 1) * perPage,
        take: perPage,
      })
      : key === "updated_at" || key === "temperature"
        ? await this.pageByLatestSnapshot(userId, keyword, favoriteOnly, page, perPage, key, descending)
        : this.sortCities(allCities ?? [], preference, key, params.direction).slice((page - 1) * perPage, page * perPage);

    return {
      cities: pageCities.map((city) => serializeCity(city, preference)),
      meta: {
        page,
        per_page: perPage,
        total_count: totalCount,
        summary,
      },
    };
  }

  async compare(userId: bigint, ids: bigint[]) {
    const uniqueIds = [...new Set(ids)];
    if (uniqueIds.length < 2 || uniqueIds.length > 4) throw new CityComparisonInputError("比較する都市を2～4件選択してください。");

    const cities = await this.prisma.city.findMany({ where: { userId, id: { in: uniqueIds } }, include: LATEST_CITY_INCLUDE });
    if (cities.length !== uniqueIds.length) throw new CityComparisonNotFoundError("比較対象の都市が見つかりません。");
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

  async filteredCities(userId: bigint, params: Record<string, string | undefined>, preference?: WeatherPreference): Promise<CityWithSnapshots[]> {
    const keyword = (params.keyword ?? "").trim().toLowerCase();
    const cities = await this.prisma.city.findMany({
      where: this.cityWhere(userId, keyword, params.favorites_only === "true"),
      include: LATEST_CITY_INCLUDE,
    });
    const resolvedPreference = preference ?? await this.weatherPreferenceService.preferenceFor(userId);
    return this.sortCities(cities, resolvedPreference, params.sort, params.direction);
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
    const key = this.sortKey(sort);
    const descending = direction === "asc" ? false : true;
    return cities.slice().sort((left, right) => {
      const leftValue = this.sortValue(left, preference, key!);
      const rightValue = this.sortValue(right, preference, key!);
      if (leftValue === rightValue) return left.id < right.id ? -1 : left.id > right.id ? 1 : 0;
      if (typeof leftValue === "string" && typeof rightValue === "string") return descending ? rightValue.localeCompare(leftValue) : leftValue.localeCompare(rightValue);
      return descending ? Number(rightValue) - Number(leftValue) : Number(leftValue) - Number(rightValue);
    });
  }

  private sortKey(sort: string | undefined) {
    return ["name", "score", "updated_at", "temperature"].includes(sort ?? "") ? sort! : "score";
  }

  private cityWhere(userId: bigint, keyword: string, favoriteOnly: boolean): Prisma.CityWhereInput {
    return {
      userId,
      ...(favoriteOnly ? { favorite: true } : {}),
      ...(keyword ? {
        OR: [
          { name: { contains: keyword, mode: "insensitive" } },
          { country: { contains: keyword, mode: "insensitive" } },
          { admin1: { contains: keyword, mode: "insensitive" } },
          { countryCode: { contains: keyword, mode: "insensitive" } },
        ],
      } : {}),
    };
  }

  private async summaryFor(userId: bigint, keyword: string, favoriteOnly: boolean, preference: WeatherPreference) {
    const keywordPattern = `%${keyword}%`;
    const targetTemperature = Number(preference.targetTemperature);
    const temperatureWeight = Number(preference.temperatureWeight);
    const precipitationWeight = Number(preference.precipitationWeight);
    const humidityWeight = Number(preference.humidityWeight);
    const windWeight = Number(preference.windWeight);
    const airQualityWeight = Number(preference.airQualityWeight);
    const rows = await this.prisma.$queryRaw<Array<{
      recommended: number;
      average_temperature: number | null;
      refreshed: number;
    }>>(Prisma.sql`
      WITH latest AS (
        SELECT
          snapshot."id" AS snapshot_id,
          snapshot."current_temperature",
          snapshot."current_humidity",
          snapshot."current_wind_speed",
          snapshot."current_us_aqi",
          snapshot."daily_data"
        FROM "cities" AS city
        LEFT JOIN LATERAL (
          SELECT
            snapshot."id",
            snapshot."current_temperature",
            snapshot."current_humidity",
            snapshot."current_wind_speed",
            snapshot."current_us_aqi",
            snapshot."daily_data"
          FROM "weather_snapshots" AS snapshot
          WHERE snapshot."city_id" = city."id"
          ORDER BY snapshot."fetched_at" DESC
          LIMIT 1
        ) AS snapshot ON true
        WHERE city."user_id" = ${userId}
          ${favoriteOnly ? Prisma.sql`AND city."favorite" = true` : Prisma.empty}
          ${keyword ? Prisma.sql`AND (
            city."name" ILIKE ${keywordPattern}
            OR city."country" ILIKE ${keywordPattern}
            OR city."admin1" ILIKE ${keywordPattern}
            OR city."country_code" ILIKE ${keywordPattern}
          )` : Prisma.empty}
      ), components AS (
        SELECT
          latest.*,
          CASE
            WHEN current_temperature IS NULL THEN NULL
            ELSE GREATEST(ROUND(100 - ABS(current_temperature::double precision - ${targetTemperature}) * 5), 0)
          END AS temperature_score,
          CASE
            WHEN jsonb_typeof(daily_data -> 'precipitation_probability_max') = 'array'
              AND jsonb_typeof(daily_data -> 'precipitation_probability_max' -> 0) = 'number'
            THEN GREATEST(ROUND(100 - (daily_data -> 'precipitation_probability_max' ->> 0)::double precision), 0)
            ELSE NULL
          END AS precipitation_score,
          CASE
            WHEN current_humidity IS NULL THEN NULL
            ELSE GREATEST(ROUND(100 - ABS(current_humidity::double precision - 50) * 2), 0)
          END AS humidity_score,
          CASE
            WHEN current_wind_speed IS NULL THEN NULL
            ELSE GREATEST(ROUND(100 - current_wind_speed::double precision * 2.5), 0)
          END AS wind_score,
          CASE
            WHEN current_us_aqi IS NULL THEN NULL
            ELSE GREATEST(ROUND(100 - current_us_aqi::double precision), 0)
          END AS air_quality_score
        FROM latest
      ), weighted AS (
        SELECT
          components.*,
          (
            CASE WHEN temperature_score IS NOT NULL THEN ${temperatureWeight} ELSE 0 END
            + CASE WHEN precipitation_score IS NOT NULL THEN ${precipitationWeight} ELSE 0 END
            + CASE WHEN humidity_score IS NOT NULL THEN ${humidityWeight} ELSE 0 END
            + CASE WHEN wind_score IS NOT NULL THEN ${windWeight} ELSE 0 END
            + CASE WHEN air_quality_score IS NOT NULL THEN ${airQualityWeight} ELSE 0 END
          ) AS total_weight,
          (
            COALESCE(temperature_score * ${temperatureWeight}, 0)
            + COALESCE(precipitation_score * ${precipitationWeight}, 0)
            + COALESCE(humidity_score * ${humidityWeight}, 0)
            + COALESCE(wind_score * ${windWeight}, 0)
            + COALESCE(air_quality_score * ${airQualityWeight}, 0)
          ) AS weighted_total,
          (
            COALESCE(temperature_score, 0)
            + COALESCE(precipitation_score, 0)
            + COALESCE(humidity_score, 0)
            + COALESCE(wind_score, 0)
            + COALESCE(air_quality_score, 0)
          ) AS component_total,
          (
            (temperature_score IS NOT NULL)::int
            + (precipitation_score IS NOT NULL)::int
            + (humidity_score IS NOT NULL)::int
            + (wind_score IS NOT NULL)::int
            + (air_quality_score IS NOT NULL)::int
          ) AS component_count
        FROM components
      )
      SELECT
        COUNT(*) FILTER (
          WHERE CASE
            WHEN component_count = 0 THEN 0
            WHEN total_weight = 0 THEN ROUND(component_total / component_count)
            ELSE ROUND(weighted_total / total_weight)
          END >= 70
        )::int AS recommended,
        ROUND(AVG(current_temperature), 1)::double precision AS average_temperature,
        COUNT(snapshot_id)::int AS refreshed
      FROM weighted
    `);
    const summary = rows[0];
    return {
      recommended: Number(summary?.recommended ?? 0),
      average_temperature: summary?.average_temperature === null || summary?.average_temperature === undefined ? null : Number(summary.average_temperature),
      refreshed: Number(summary?.refreshed ?? 0),
    };
  }

  private async pageByLatestSnapshot(
    userId: bigint,
    keyword: string,
    favoriteOnly: boolean,
    page: number,
    perPage: number,
    sort: "updated_at" | "temperature",
    descending: boolean,
  ): Promise<CityWithSnapshots[]> {
    const order = descending ? Prisma.sql`DESC NULLS LAST` : Prisma.sql`ASC NULLS FIRST`;
    const sortColumn = sort === "temperature" ? Prisma.sql`latest."current_temperature"` : Prisma.sql`latest."fetched_at"`;
    const keywordPattern = `%${keyword}%`;
    const rows = await this.prisma.$queryRaw<Array<{ id: bigint }>>(Prisma.sql`
      SELECT city."id"
      FROM "cities" AS city
      LEFT JOIN LATERAL (
        SELECT snapshot."fetched_at", snapshot."current_temperature"
        FROM "weather_snapshots" AS snapshot
        WHERE snapshot."city_id" = city."id"
        ORDER BY snapshot."fetched_at" DESC
        LIMIT 1
      ) AS latest ON true
      WHERE city."user_id" = ${userId}
        ${favoriteOnly ? Prisma.sql`AND city."favorite" = true` : Prisma.empty}
        ${keyword ? Prisma.sql`AND (
          city."name" ILIKE ${keywordPattern}
          OR city."country" ILIKE ${keywordPattern}
          OR city."admin1" ILIKE ${keywordPattern}
          OR city."country_code" ILIKE ${keywordPattern}
        )` : Prisma.empty}
      ORDER BY ${sortColumn} ${order}, city."id" ASC
      OFFSET ${(page - 1) * perPage}
      LIMIT ${perPage}
    `);
    const ids = rows.map((row) => row.id);
    if (ids.length === 0) return [];

    const cities = await this.prisma.city.findMany({ where: { userId, id: { in: ids } }, include: LATEST_CITY_INCLUDE });
    const positions = new Map(ids.map((id, index) => [id.toString(), index]));
    return cities.sort((left, right) => (positions.get(left.id.toString()) ?? 0) - (positions.get(right.id.toString()) ?? 0));
  }

  private sortValue(city: CityWithSnapshots, preference: WeatherPreference, key: string) {
    if (key === "name") return city.name.toLowerCase();
    if (key === "temperature") return this.numberOrNull(city.weatherSnapshots[0]?.currentTemperature) ?? Number.NEGATIVE_INFINITY;
    if (key === "updated_at") return city.weatherSnapshots[0]?.fetchedAt.getTime() ?? Number.NEGATIVE_INFINITY;
    return scoreFor(preference, city.weatherSnapshots[0] ?? null);
  }

  private average(values: number[]) {
    return values.length ? Math.round((values.reduce((sum, value) => sum + value, 0) / values.length) * 10) / 10 : 0;
  }

  private numberOrNull(value: unknown) {
    return value === null || value === undefined ? null : Number(value);
  }
}
