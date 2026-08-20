import { Injectable } from "@nestjs/common";

import { PrismaService } from "../prisma.service";
import { WeatherClient } from "../weather/weather.client";
import { RouteClient } from "./route.client";
import { parseTravelDateTime } from "./timezone";

@Injectable()
export class TravelService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly routeClient: RouteClient,
    private readonly weatherClient: WeatherClient,
  ) {}

  async plan(userId: bigint, fromId: bigint, toId: bigint, requestedDepartureAt?: string | Date) {
    const context = await this.travelContext(userId, fromId, toId);
    if (!context) return null;
    const { from, to } = context;

    const departureAt = parseTravelDateTime(requestedDepartureAt, from.timezone);
    const route = await this.routeClient.routeFor(from, to);
    const arrivalAt = new Date(departureAt.getTime() + route.durationSeconds * 1000);
    const arrivalWeather = await this.weatherClient.hourlyWeatherFor(to, arrivalAt);

    return {
      from: { id: Number(from.id), name: from.name, timezone: from.timezone },
      to: { id: Number(to.id), name: to.name, timezone: to.timezone },
      mode: "driving",
      transfer_count: 0,
      departure_at: departureAt.toISOString(),
      arrival_at: arrivalAt.toISOString(),
      duration_minutes: Math.max(1, Math.round(route.durationSeconds / 60)),
      distance_km: Math.round((route.distanceMeters / 1000) * 10) / 10,
      arrival_weather: arrivalWeather,
      recommendation: this.recommendation(arrivalWeather?.precipitation_probability ?? null),
    };
  }

  async bestDeparture(
    userId: bigint,
    fromId: bigint,
    toId: bigint,
    windowStart: string | Date,
    windowEnd: string | Date,
    intervalMinutes = 15,
  ) {
    const context = await this.travelContext(userId, fromId, toId);
    if (!context) return null;
    const departureWindowStart = parseTravelDateTime(windowStart, context.from.timezone);
    const departureWindowEnd = parseTravelDateTime(windowEnd, context.from.timezone);
    if (departureWindowStart >= departureWindowEnd) {
      throw new Error("出発可能時間の範囲が正しくありません。");
    }
    if (!Number.isInteger(intervalMinutes) || intervalMinutes < 5 || intervalMinutes > 60) {
      throw new Error("候補の間隔は5分から60分の間で指定してください。");
    }

    const candidateCount = Math.floor((departureWindowEnd.getTime() - departureWindowStart.getTime()) / (intervalMinutes * 60_000)) + 1;
    if (candidateCount > 25) {
      throw new Error("出発可能時間は候補が25件以内になるよう指定してください。");
    }

    const { from, to } = context;
    const route = await this.routeClient.routeFor(from, to);
    const candidates = [];

    for (let index = 0; index < candidateCount; index += 1) {
      const departureAt = new Date(departureWindowStart.getTime() + index * intervalMinutes * 60_000);
      const arrivalAt = new Date(departureAt.getTime() + route.durationSeconds * 1000);
      const arrivalWeather = await this.weatherClient.hourlyWeatherFor(to, arrivalAt);
      candidates.push({
        departure_at: departureAt.toISOString(),
        arrival_at: arrivalAt.toISOString(),
        arrival_weather: arrivalWeather,
        weather_score: this.weatherScore(arrivalWeather?.precipitation_probability ?? null),
        recommendation: this.recommendation(arrivalWeather?.precipitation_probability ?? null),
      });
    }

    const validCandidates = candidates.filter((candidate) => candidate.weather_score !== null);
    const recommended = validCandidates.reduce<typeof candidates[number] | null>((best, candidate) => !best || candidate.weather_score! > best.weather_score! ? candidate : best, null);
    const firstCandidate = candidates[0];

    return {
      from: { id: Number(from.id), name: from.name, timezone: from.timezone },
      to: { id: Number(to.id), name: to.name, timezone: to.timezone },
      mode: "driving",
      transfer_count: 0,
      duration_minutes: Math.max(1, Math.round(route.durationSeconds / 60)),
      distance_km: Math.round((route.distanceMeters / 1000) * 10) / 10,
      window_start: departureWindowStart.toISOString(),
      window_end: departureWindowEnd.toISOString(),
      interval_minutes: intervalMinutes,
      recommended,
      candidates,
      reason: recommended ? this.bestDepartureReason(firstCandidate, recommended) : "この時間帯の到着時予報を取得できませんでした。",
    };
  }

  private async travelContext(userId: bigint, fromId: bigint, toId: bigint) {
    if (fromId === toId) throw new Error("出発地と到着地には別の都市を選択してください。");

    const cities = await this.prisma.city.findMany({ where: { userId, id: { in: [fromId, toId] } } });
    const from = cities.find((city) => city.id === fromId);
    const to = cities.find((city) => city.id === toId);
    if (!from || !to) return null;
    return { from, to };
  }

  private weatherScore(precipitationProbability: number | null) {
    if (precipitationProbability === null || !Number.isFinite(precipitationProbability)) return null;
    return Math.max(0, Math.min(100, Math.round(100 - precipitationProbability)));
  }

  private bestDepartureReason(firstCandidate: { departure_at: string; arrival_weather: { precipitation_probability: number | null } | null }, recommended: { departure_at: string; arrival_weather: { precipitation_probability: number | null } | null }) {
    const firstRain = firstCandidate.arrival_weather?.precipitation_probability;
    const recommendedRain = recommended.arrival_weather?.precipitation_probability;
    const rainImprovement = firstRain !== null && firstRain !== undefined && recommendedRain !== null && recommendedRain !== undefined
      ? firstRain - recommendedRain
      : 0;
    const departureDeltaMinutes = Math.round((new Date(recommended.departure_at).getTime() - new Date(firstCandidate.departure_at).getTime()) / 60_000);

    if (departureDeltaMinutes !== 0 && rainImprovement >= 10) {
      return `${Math.abs(departureDeltaMinutes)}分${departureDeltaMinutes > 0 ? "遅らせる" : "早める"}と到着時の雨を避けやすくなります。`;
    }
    return "この時間帯では、到着時の降水確率が最も低い出発時刻です。";
  }

  private recommendation(precipitationProbability: number | null) {
    if (precipitationProbability === null) return { code: "unknown" as const };
    if (precipitationProbability >= 50) return { code: "umbrella" as const };
    if (precipitationProbability >= 30) return { code: "caution" as const };
    return { code: "clear" as const };
  }
}
