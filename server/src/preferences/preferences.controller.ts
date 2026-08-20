import { Body, Controller, Get, Patch, Req, UseGuards } from "@nestjs/common";
import { Type } from "class-transformer";
import { IsDefined, IsInt, IsNumber, IsOptional, Max, Min, ValidateNested } from "class-validator";

import { AuthGuard } from "../auth/auth.guard";
import type { AuthenticatedRequest } from "../auth/auth.types";
import { ReadOnlyGuard } from "../auth/readonly.guard";
import { serializePreference } from "../weather/city-serializer";
import { WeatherPreferenceService } from "../cities/weather-preference.service";

const FIELDS = ["target_temperature", "temperature_weight", "precipitation_weight", "humidity_weight", "wind_weight", "air_quality_weight"] as const;

export class WeatherPreferenceInputDto {
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ allowNaN: false, allowInfinity: false })
  @Min(-50)
  @Max(60)
  target_temperature?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(10)
  temperature_weight?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(10)
  precipitation_weight?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(10)
  humidity_weight?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(10)
  wind_weight?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(10)
  air_quality_weight?: number;
}

export class UpdateWeatherPreferenceDto {
  @IsDefined()
  @ValidateNested()
  @Type(() => WeatherPreferenceInputDto)
  weather_preference!: WeatherPreferenceInputDto;
}

@Controller("api/weather_preference")
@UseGuards(AuthGuard, ReadOnlyGuard)
export class PreferencesController {
  constructor(private readonly weatherPreferenceService: WeatherPreferenceService) {}

  @Get()
  async show(@Req() request: AuthenticatedRequest) {
    return serializePreference(await this.weatherPreferenceService.preferenceFor(request.user.id));
  }

  @Patch()
  async update(@Req() request: AuthenticatedRequest, @Body() body: UpdateWeatherPreferenceDto) {
    const input = body.weather_preference;
    const values: Record<string, number> = {};
    FIELDS.forEach((field) => {
      if (input[field] !== undefined) values[this.camelize(field)] = input[field] as number;
    });
    return serializePreference(await this.weatherPreferenceService.updatePreference(request.user.id, values));
  }

  private camelize(field: string) {
    return field.replace(/_([a-z])/g, (_, letter: string) => letter.toUpperCase());
  }
}
