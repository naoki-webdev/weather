import { Body, Controller, Delete, Get, HttpCode, HttpException, HttpStatus, Param, Patch, Post, Query, Req, Res, UseGuards } from "@nestjs/common";
import { IsBoolean, IsDefined, IsNotEmpty, IsNumber, IsString, IsTimeZone, Length, Max, Min, ValidateNested } from "class-validator";
import { Type } from "class-transformer";
import type { Response } from "express";
import { Throttle } from "@nestjs/throttler";

import { AuthGuard } from "../auth/auth.guard";
import type { AuthenticatedRequest } from "../auth/auth.types";
import { ReadOnlyGuard } from "../auth/readonly.guard";
import { CitiesCsvService } from "./cities-csv.service";
import { CitiesQueryService } from "./cities.query.service";
import { CitiesService } from "./cities.service";
import { CityComparisonInputError, CityComparisonNotFoundError } from "./cities.errors";
import { OpenMeteoRequestError } from "../weather/weather.client";

export class CityInputDto {
  @IsString() @IsNotEmpty() external_id!: string;
  @IsString() @IsNotEmpty() name!: string;
  @IsString() @IsNotEmpty() country!: string;
  @IsString() @Length(2, 2) country_code!: string;
  @IsString() admin1!: string;
  @IsNumber() @Min(-90) @Max(90) latitude!: number;
  @IsNumber() @Min(-180) @Max(180) longitude!: number;
  @IsString() @IsTimeZone() timezone!: string;
  @IsString() @IsNotEmpty() source_name!: string;
}

export class CreateCityDto {
  @IsDefined()
  @ValidateNested()
  @Type(() => CityInputDto)
  city!: CityInputDto;
}

class FavoriteDto {
  @IsBoolean()
  favorite!: boolean;
}

export class UpdateFavoriteDto {
  @IsDefined()
  @ValidateNested()
  @Type(() => FavoriteDto)
  city!: FavoriteDto;
}

@Controller("api/cities")
@UseGuards(AuthGuard, ReadOnlyGuard)
export class CitiesController {
  constructor(
    private readonly citiesService: CitiesService,
    private readonly citiesQueryService: CitiesQueryService,
    private readonly citiesCsvService: CitiesCsvService,
  ) {}

  @Get()
  index(@Req() request: AuthenticatedRequest, @Query() query: Record<string, string | undefined>) {
    return this.citiesQueryService.list(request.user.id, query);
  }

  @Get("search")
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  async search(@Query("query") query = "") {
    try {
      return { results: await this.citiesService.search(query) };
    } catch (error) {
      this.handleExternalError(error);
    }
  }

  @Get("compare")
  async compare(@Req() request: AuthenticatedRequest, @Query() query: Record<string, string | string[] | undefined>) {
    const ids = query.ids ?? query["ids[]"] ?? [];
    const values = Array.isArray(ids) ? ids : [ids];
    const parsed = values
      .flatMap((value) => String(value ?? "").split(","))
      .filter((value) => /^\d+$/.test(value))
      .map((value) => BigInt(value));
    try {
      return await this.citiesQueryService.compare(request.user.id, parsed);
    } catch (error) {
      if (error instanceof CityComparisonInputError) throw new HttpException({ errors: [error.message] }, HttpStatus.BAD_REQUEST);
      if (error instanceof CityComparisonNotFoundError) throw new HttpException({ errors: [error.message] }, HttpStatus.NOT_FOUND);
      throw error;
    }
  }

  @Get("export")
  async export(@Req() request: AuthenticatedRequest, @Query() query: Record<string, string | undefined>, @Res() response: Response) {
    const csv = await this.citiesCsvService.csv(request.user.id, query);
    response.setHeader("Content-Type", "text/csv; charset=utf-8");
    response.setHeader("Content-Disposition", `attachment; filename="weather-cities-${this.timestamp()}.csv"`);
    response.send(csv);
  }

  @Get(":id")
  async show(@Req() request: AuthenticatedRequest, @Param("id") id: string) {
    const city = await this.citiesService.findOne(request.user.id, this.parseId(id), true);
    if (!city) throw new HttpException({ errors: ["都市が見つかりません。"] }, HttpStatus.NOT_FOUND);
    return city;
  }

  @Post()
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  async create(@Req() request: AuthenticatedRequest, @Body() body: CreateCityDto) {
    try {
      const result = await this.citiesService.upsert(request.user.id, body.city);
      const response = result.city as Record<string, unknown>;
      if (result.syncError) response.weather_sync_error = result.syncError;
      return response;
    } catch (error) {
      this.handleExternalError(error);
    }
  }

  @Delete(":id")
  @HttpCode(HttpStatus.NO_CONTENT)
  async destroy(@Req() request: AuthenticatedRequest, @Param("id") id: string) {
    if (!(await this.citiesService.remove(request.user.id, this.parseId(id)))) throw new HttpException({ errors: ["都市が見つかりません。"] }, HttpStatus.NOT_FOUND);
  }

  @Post(":id/sync")
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  async sync(@Req() request: AuthenticatedRequest, @Param("id") id: string) {
    try {
      const city = await this.citiesService.sync(request.user.id, this.parseId(id));
      if (!city) throw new HttpException({ errors: ["都市が見つかりません。"] }, HttpStatus.NOT_FOUND);
      return city;
    } catch (error) {
      this.handleExternalError(error);
    }
  }

  @Patch(":id/favorite")
  async favorite(@Req() request: AuthenticatedRequest, @Param("id") id: string, @Body() body: UpdateFavoriteDto) {
    const city = await this.citiesService.favorite(request.user.id, this.parseId(id), body.city.favorite);
    if (!city) throw new HttpException({ errors: ["都市が見つかりません。"] }, HttpStatus.NOT_FOUND);
    return city;
  }

  private timestamp() {
    const now = new Date();
    const pad = (value: number) => String(value).padStart(2, "0");
    return `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
  }

  private handleExternalError(error: unknown): never {
    if (error instanceof OpenMeteoRequestError) throw new HttpException({ errors: [error.message] }, HttpStatus.BAD_GATEWAY);
    throw error;
  }

  private parseId(value: string) {
    if (!/^\d+$/.test(value)) throw new HttpException({ errors: ["都市が見つかりません。"] }, HttpStatus.NOT_FOUND);
    return BigInt(value);
  }
}
