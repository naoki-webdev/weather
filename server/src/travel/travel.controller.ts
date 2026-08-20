import { Controller, Get, HttpException, HttpStatus, Query, Req, UseGuards } from "@nestjs/common";
import { Throttle } from "@nestjs/throttler";

import { AuthGuard } from "../auth/auth.guard";
import type { AuthenticatedRequest } from "../auth/auth.types";
import { ReadOnlyGuard } from "../auth/readonly.guard";
import { ForecastOutOfRangeError, OpenMeteoRequestError } from "../weather/weather.client";
import { RouteRequestError } from "./route.client";
import { TravelService } from "./travel.service";
import { TravelDateTimeError } from "./timezone";

@Controller("api/travel")
@UseGuards(AuthGuard, ReadOnlyGuard)
export class TravelController {
  constructor(private readonly travelService: TravelService) {}

  @Get("plan")
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  async plan(@Req() request: AuthenticatedRequest, @Query("from_id") fromId?: string, @Query("to_id") toId?: string, @Query("departure_at") departureAt?: string) {
    if (!fromId || !toId || !/^\d+$/.test(fromId) || !/^\d+$/.test(toId)) {
      throw new HttpException({ errors: ["出発地と到着地を指定してください。"] }, HttpStatus.BAD_REQUEST);
    }

    try {
      const result = await this.travelService.plan(request.user.id, BigInt(fromId), BigInt(toId), departureAt);
      if (!result) throw new HttpException({ errors: ["移動対象の都市が見つかりません。"] }, HttpStatus.NOT_FOUND);
      return result;
    } catch (error) {
      this.handleTravelError(error);
    }
  }

  @Get("best-departure")
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  async bestDeparture(
    @Req() request: AuthenticatedRequest,
    @Query("from_id") fromId?: string,
    @Query("to_id") toId?: string,
    @Query("window_start") windowStart?: string,
    @Query("window_end") windowEnd?: string,
    @Query("interval_minutes") intervalMinutes?: string,
  ) {
    if (!fromId || !toId || !/^\d+$/.test(fromId) || !/^\d+$/.test(toId) || !windowStart || !windowEnd) {
      throw new HttpException({ errors: ["出発地・到着地・出発可能時間を指定してください。"] }, HttpStatus.BAD_REQUEST);
    }

    const parsedWindowStart = new Date(windowStart);
    const parsedWindowEnd = new Date(windowEnd);
    if (Number.isNaN(parsedWindowStart.getTime()) || Number.isNaN(parsedWindowEnd.getTime()) || parsedWindowStart >= parsedWindowEnd) {
      throw new HttpException({ errors: ["出発可能時間の形式が正しくありません。"] }, HttpStatus.BAD_REQUEST);
    }

    const parsedInterval = intervalMinutes === undefined ? 15 : Number(intervalMinutes);
    if (!Number.isInteger(parsedInterval) || parsedInterval < 5 || parsedInterval > 60) {
      throw new HttpException({ errors: ["候補の間隔は5分から60分の間で指定してください。"] }, HttpStatus.BAD_REQUEST);
    }

    try {
      const result = await this.travelService.bestDeparture(request.user.id, BigInt(fromId), BigInt(toId), windowStart, windowEnd, parsedInterval);
      if (!result) throw new HttpException({ errors: ["移動対象の都市が見つかりません。"] }, HttpStatus.NOT_FOUND);
      return result;
    } catch (error) {
      this.handleTravelError(error);
    }
  }

  private handleTravelError(error: unknown): never {
    if (error instanceof HttpException) throw error;
    if (error instanceof ForecastOutOfRangeError) {
      throw new HttpException({ errors: [error.message] }, HttpStatus.UNPROCESSABLE_ENTITY);
    }
    if (error instanceof RouteRequestError || error instanceof OpenMeteoRequestError) {
      throw new HttpException({ errors: [error.message] }, HttpStatus.BAD_GATEWAY);
    }
    if (error instanceof TravelDateTimeError) {
      throw new HttpException({ errors: [error.message] }, HttpStatus.BAD_REQUEST);
    }
    if (error instanceof Error) throw new HttpException({ errors: [error.message] }, HttpStatus.UNPROCESSABLE_ENTITY);
    throw error;
  }
}
