import { Injectable } from "@nestjs/common";
import { Interval } from "@nestjs/schedule";

import { WeatherService } from "./weather.service";

@Injectable()
export class WeatherScheduler {
  constructor(private readonly weatherService: WeatherService) {}

  @Interval(30 * 60 * 1000)
  syncAllCities() {
    return this.weatherService.syncAll();
  }
}
