import { Injectable } from "@nestjs/common";
import { Prisma, type WeatherPreference } from "@prisma/client";

import { PrismaService } from "../prisma.service";
import { serializeCity, type CityWithSnapshots } from "../weather/city-serializer";
import { historyRange, PERIOD_DAYS } from "../weather/weather-history";
import { scoreFor } from "../weather/weather-score";
import { scoreComponentsSqlFor, scoreSqlFromComponents } from "../weather/weather-score.sql";
import { WeatherPreferenceService } from "./weather-preference.service";
import { CityComparisonInputError, CityComparisonNotFoundError, CityQueryInputError } from "./cities.errors";

export const LATEST_CITY_INCLUDE = {
  weatherSnapshots: { orderBy: { fetchedAt: "desc" as const }, take: 1 },
};

type CityListSummary = {
  recommended: number;
  average_temperature: number | null;
  refreshed: number;
};

type CityListMetadata = {
  total_count: number;
  summary: CityListSummary;
};

@Injectable()
export class CitiesQueryService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly weatherPreferenceService: WeatherPreferenceService,
  ) {}

  async list(userId: bigint, params: Record<string, string | undefined>) {
    const page = this.parsePositiveInteger(params.page, 1, "ページ番号");
    const perPage = Math.min(this.parsePositiveInteger(params.per_page, 20, "1ページあたりの件数"), 100);
    if ((page - 1) > Math.floor(Number.MAX_SAFE_INTEGER / perPage)) {
      throw new CityQueryInputError("ページ番号が大きすぎます。");
    }
    const preference = await this.weatherPreferenceService.preferenceFor(userId);
    const keyword = (params.keyword ?? "").trim().toLowerCase();
    const favoriteOnly = params.favorites_only === "true";
    const where = this.cityWhere(userId, keyword, favoriteOnly);
    const key = this.sortKey(params.sort);
    const descending = params.direction !== "asc";
    const direction = descending ? ("desc" as const) : ("asc" as const);
    const includeSummary = params.include_summary !== "false";
    let metadata: CityListMetadata | null = null;
    let pageCities: CityWithSnapshots[];

    if (key === "score" && includeSummary) {
      const result = await this.scorePageAndSummary(userId, keyword, favoriteOnly, page, perPage, preference, descending);
      metadata = result.metadata;
      pageCities = result.cities;
    } else {
      const loadPage = () => key === "score"
        ? this.pageByScore(userId, keyword, favoriteOnly, page, perPage, preference, descending)
        : key === "name"
          ? this.prisma.city.findMany({
            where,
            include: LATEST_CITY_INCLUDE,
            orderBy: [{ name: direction }, { id: "asc" }],
            skip: (page - 1) * perPage,
            take: perPage,
          })
          : key === "updated_at" || key === "temperature"
            ? this.pageByLatestSnapshot(userId, keyword, favoriteOnly, page, perPage, key, descending)
            : Promise.resolve([] as CityWithSnapshots[]);

      if (includeSummary) {
        [metadata, pageCities] = await Promise.all([
          this.summaryFor(userId, keyword, favoriteOnly, preference),
          loadPage(),
        ]);
      } else {
        pageCities = await loadPage();
      }
    }

    return {
      cities: pageCities.map((city) => serializeCity(city, preference)),
      meta: {
        page,
        per_page: perPage,
        ...(metadata ?? {}),
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
    const scoredCities = uniqueIds.flatMap((id) => {
      const score = scores.get(id);
      return score === null || score === undefined ? [] : [{ id, score }];
    });
    const leaderId = scoredCities.slice().sort((left, right) => right.score - left.score)[0]?.id ?? null;
    const averageScore = this.average(scoredCities.map(({ score }) => score));

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
      if (leftValue === null || leftValue === undefined) return rightValue === null || rightValue === undefined ? (left.id < right.id ? -1 : left.id > right.id ? 1 : 0) : 1;
      if (rightValue === null || rightValue === undefined) return -1;
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

  private ilikePattern(keyword: string) {
    return `%${keyword.replace(/[\\%_]/g, "\\$&")}%`;
  }

  private async summaryFor(userId: bigint, keyword: string, favoriteOnly: boolean, preference: WeatherPreference): Promise<CityListMetadata> {
    const keywordPattern = this.ilikePattern(keyword);
    const scoreComponents = scoreComponentsSqlFor(preference, {
      temperature: Prisma.sql`latest."current_temperature"`,
      precipitation: Prisma.sql`latest."precipitation_probability"`,
      humidity: Prisma.sql`latest."current_humidity"`,
      wind: Prisma.sql`latest."current_wind_speed"`,
      airQuality: Prisma.sql`latest."current_us_aqi"`,
    });
    const scoreFromComponents = scoreSqlFromComponents(preference, {
      temperature: Prisma.sql`components."temperature_score"`,
      precipitation: Prisma.sql`components."precipitation_score"`,
      humidity: Prisma.sql`components."humidity_score"`,
      wind: Prisma.sql`components."wind_score"`,
      air_quality: Prisma.sql`components."air_quality_score"`,
    });
    const rows = await this.prisma.$queryRaw<Array<{
      total_count: number;
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
            CASE
              WHEN jsonb_typeof(snapshot."daily_data" -> 'precipitation_probability_max') = 'array'
                AND jsonb_typeof(snapshot."daily_data" -> 'precipitation_probability_max' -> 0) = 'number'
              THEN (snapshot."daily_data" -> 'precipitation_probability_max' ->> 0)::double precision
              ELSE NULL
            END AS "precipitation_probability"
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
          ${scoreComponents.temperature} AS "temperature_score",
          ${scoreComponents.precipitation} AS "precipitation_score",
          ${scoreComponents.humidity} AS "humidity_score",
          ${scoreComponents.wind} AS "wind_score",
          ${scoreComponents.air_quality} AS "air_quality_score"
        FROM latest
      ), scored AS (
        SELECT
          components.*,
          ${scoreFromComponents} AS "score"
        FROM components
      )
      SELECT
        COUNT(*)::int AS total_count,
        COUNT(*) FILTER (WHERE "score" >= 70)::int AS recommended,
        ROUND(AVG("current_temperature"), 1)::double precision AS average_temperature,
        COUNT(snapshot_id)::int AS refreshed
      FROM scored
    `);
    const summary = rows[0];
    return {
      total_count: Number(summary?.total_count ?? 0),
      summary: {
        recommended: Number(summary?.recommended ?? 0),
        average_temperature: summary?.average_temperature === null || summary?.average_temperature === undefined ? null : Number(summary.average_temperature),
        refreshed: Number(summary?.refreshed ?? 0),
      },
    };
  }

  private async scorePageAndSummary(
    userId: bigint,
    keyword: string,
    favoriteOnly: boolean,
    page: number,
    perPage: number,
    preference: WeatherPreference,
    descending: boolean,
  ): Promise<{ cities: CityWithSnapshots[]; metadata: CityListMetadata }> {
    const order = descending ? Prisma.sql`DESC` : Prisma.sql`ASC`;
    const keywordPattern = this.ilikePattern(keyword);
    const scoreComponents = scoreComponentsSqlFor(preference, {
      temperature: Prisma.sql`latest."current_temperature"`,
      precipitation: Prisma.sql`latest."precipitation_probability"`,
      humidity: Prisma.sql`latest."current_humidity"`,
      wind: Prisma.sql`latest."current_wind_speed"`,
      airQuality: Prisma.sql`latest."current_us_aqi"`,
    });
    const scoreFromComponents = scoreSqlFromComponents(preference, {
      temperature: Prisma.sql`components."temperature_score"`,
      precipitation: Prisma.sql`components."precipitation_score"`,
      humidity: Prisma.sql`components."humidity_score"`,
      wind: Prisma.sql`components."wind_score"`,
      air_quality: Prisma.sql`components."air_quality_score"`,
    });
    const rows = await this.prisma.$queryRaw<Array<{
      total_count: number;
      recommended: number;
      average_temperature: number | null;
      refreshed: number;
      page_id: bigint | null;
    }>>(Prisma.sql`
      WITH latest AS (
        SELECT
          city."id",
          snapshot."id" AS snapshot_id,
          snapshot."current_temperature",
          snapshot."current_humidity",
          snapshot."current_wind_speed",
          snapshot."current_us_aqi",
          CASE
            WHEN jsonb_typeof(snapshot."daily_data" -> 'precipitation_probability_max') = 'array'
              AND jsonb_typeof(snapshot."daily_data" -> 'precipitation_probability_max' -> 0) = 'number'
            THEN (snapshot."daily_data" -> 'precipitation_probability_max' ->> 0)::double precision
            ELSE NULL
          END AS "precipitation_probability"
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
          ${scoreComponents.temperature} AS "temperature_score",
          ${scoreComponents.precipitation} AS "precipitation_score",
          ${scoreComponents.humidity} AS "humidity_score",
          ${scoreComponents.wind} AS "wind_score",
          ${scoreComponents.air_quality} AS "air_quality_score"
        FROM latest
      ), scored AS (
        SELECT
          components.*,
          ${scoreFromComponents} AS "score"
        FROM components
      ), aggregate_summary AS (
        SELECT
          COUNT(*)::int AS total_count,
          COUNT(*) FILTER (WHERE "score" >= 70)::int AS recommended,
          ROUND(AVG("current_temperature"), 1)::double precision AS average_temperature,
          COUNT(snapshot_id)::int AS refreshed
        FROM scored
      ), page_ids AS (
        SELECT
          "id",
          ROW_NUMBER() OVER (ORDER BY "score" ${order} NULLS LAST, "id" ASC) AS "position"
        FROM scored
        ORDER BY "score" ${order} NULLS LAST, "id" ASC
        OFFSET ${(page - 1) * perPage}
        LIMIT ${perPage}
      )
      SELECT
        aggregate_summary.*,
        page_ids."id" AS page_id
      FROM aggregate_summary
      LEFT JOIN page_ids ON true
      ORDER BY page_ids."position"
    `);
    const summary = rows[0];
    const ids = rows.flatMap((row) => row.page_id === null || row.page_id === undefined ? [] : [row.page_id]);
    const cities = await this.citiesByIds(userId, ids);

    return {
      cities,
      metadata: {
        total_count: Number(summary?.total_count ?? 0),
        summary: {
          recommended: Number(summary?.recommended ?? 0),
          average_temperature: summary?.average_temperature === null || summary?.average_temperature === undefined ? null : Number(summary.average_temperature),
          refreshed: Number(summary?.refreshed ?? 0),
        },
      },
    };
  }

  private async pageByScore(
    userId: bigint,
    keyword: string,
    favoriteOnly: boolean,
    page: number,
    perPage: number,
    preference: WeatherPreference,
    descending: boolean,
  ): Promise<CityWithSnapshots[]> {
    const order = descending ? Prisma.sql`DESC` : Prisma.sql`ASC`;
    const keywordPattern = this.ilikePattern(keyword);
    const scoreComponents = scoreComponentsSqlFor(preference, {
      temperature: Prisma.sql`latest."current_temperature"`,
      precipitation: Prisma.sql`latest."precipitation_probability"`,
      humidity: Prisma.sql`latest."current_humidity"`,
      wind: Prisma.sql`latest."current_wind_speed"`,
      airQuality: Prisma.sql`latest."current_us_aqi"`,
    });
    const scoreFromComponents = scoreSqlFromComponents(preference, {
      temperature: Prisma.sql`components."temperature_score"`,
      precipitation: Prisma.sql`components."precipitation_score"`,
      humidity: Prisma.sql`components."humidity_score"`,
      wind: Prisma.sql`components."wind_score"`,
      air_quality: Prisma.sql`components."air_quality_score"`,
    });
    const rows = await this.prisma.$queryRaw<Array<{ id: bigint }>>(Prisma.sql`
      WITH latest AS (
        SELECT
          city."id",
          snapshot."current_temperature",
          snapshot."current_humidity",
          snapshot."current_wind_speed",
          snapshot."current_us_aqi",
          CASE
            WHEN jsonb_typeof(snapshot."daily_data" -> 'precipitation_probability_max') = 'array'
              AND jsonb_typeof(snapshot."daily_data" -> 'precipitation_probability_max' -> 0) = 'number'
            THEN (snapshot."daily_data" -> 'precipitation_probability_max' ->> 0)::double precision
            ELSE NULL
          END AS "precipitation_probability"
        FROM "cities" AS city
        LEFT JOIN LATERAL (
          SELECT
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
          ${scoreComponents.temperature} AS "temperature_score",
          ${scoreComponents.precipitation} AS "precipitation_score",
          ${scoreComponents.humidity} AS "humidity_score",
          ${scoreComponents.wind} AS "wind_score",
          ${scoreComponents.air_quality} AS "air_quality_score"
        FROM latest
      ), scored AS (
        SELECT
          components."id",
          ${scoreFromComponents} AS "score"
        FROM components
      )
      SELECT "id"
      FROM scored
      ORDER BY "score" ${order} NULLS LAST, "id" ASC
      OFFSET ${(page - 1) * perPage}
      LIMIT ${perPage}
    `);
    const ids = rows.map((row) => row.id);
    return this.citiesByIds(userId, ids);
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
    const keywordPattern = this.ilikePattern(keyword);
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
    return this.citiesByIds(userId, ids);
  }

  private async citiesByIds(userId: bigint, ids: bigint[]): Promise<CityWithSnapshots[]> {
    if (ids.length === 0) return [];

    const cities = await this.prisma.city.findMany({ where: { userId, id: { in: ids } }, include: LATEST_CITY_INCLUDE });
    const positions = new Map(ids.map((id, index) => [id.toString(), index]));
    return cities.sort((left, right) => (positions.get(left.id.toString()) ?? 0) - (positions.get(right.id.toString()) ?? 0));
  }

  private sortValue(city: CityWithSnapshots, preference: WeatherPreference, key: string): string | number | null {
    if (key === "name") return city.name.toLowerCase();
    if (key === "temperature") return this.numberOrNull(city.weatherSnapshots[0]?.currentTemperature);
    if (key === "updated_at") return city.weatherSnapshots[0]?.fetchedAt.getTime() ?? null;
    return scoreFor(preference, city.weatherSnapshots[0] ?? null);
  }

  private average(values: number[]) {
    return values.length ? Math.round((values.reduce((sum, value) => sum + value, 0) / values.length) * 10) / 10 : null;
  }

  private numberOrNull(value: unknown) {
    return value === null || value === undefined ? null : Number(value);
  }

  private parsePositiveInteger(raw: string | undefined, fallback: number, label: string) {
    const value = raw?.trim() ?? "";
    if (value === "") return fallback;
    if (!/^\d+$/.test(value)) throw new CityQueryInputError(`${label}は正の整数で指定してください。`);

    const parsed = Number(value);
    if (!Number.isSafeInteger(parsed) || parsed < 1) {
      throw new CityQueryInputError(`${label}は正の整数で指定してください。`);
    }
    return parsed;
  }
}
