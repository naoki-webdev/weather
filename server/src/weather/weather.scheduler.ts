import { Injectable } from "@nestjs/common";
import { Interval } from "@nestjs/schedule";

import { WeatherService } from "./weather.service";

@Injectable()
export class WeatherScheduler {
  constructor(private readonly weatherService: WeatherService) {}

  @Interval(60_000)
  async purgeDiscardedCities() {
    try { await this.weatherService.purgeDiscardedCities(); }
    catch (error) { console.error("削除済み都市の整理に失敗しました。", error instanceof Error ? error.name : "UnknownError"); }
  }

  @Interval(30 * 60 * 1000)
  syncAllCities() {
    return this.weatherService.syncAll();
  }
}
