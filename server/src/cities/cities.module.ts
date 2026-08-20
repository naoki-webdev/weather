import { Module } from "@nestjs/common";

import { AuthModule } from "../auth/auth.module";
import { WeatherModule } from "../weather/weather.module";
import { CitiesCsvService } from "./cities-csv.service";
import { CitiesQueryService } from "./cities.query.service";
import { CitiesController } from "./cities.controller";
import { CitiesService } from "./cities.service";
import { WeatherPreferenceService } from "./weather-preference.service";

@Module({
  imports: [AuthModule, WeatherModule],
  controllers: [CitiesController],
  providers: [CitiesService, CitiesQueryService, CitiesCsvService, WeatherPreferenceService],
  exports: [CitiesService, CitiesQueryService, CitiesCsvService, WeatherPreferenceService],
})
export class CitiesModule {}
