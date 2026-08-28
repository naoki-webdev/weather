import { Injectable } from "@nestjs/common";
import { stringify } from "csv-stringify/sync";

import { CitiesQueryService } from "./cities.query.service";
import { WeatherPreferenceService } from "./weather-preference.service";
import { safeCsvValue } from "./csv-safe-value";
import { scoreFor } from "../weather/weather-score";

@Injectable()
export class CitiesCsvService {
  constructor(
    private readonly citiesQueryService: CitiesQueryService,
    private readonly weatherPreferenceService: WeatherPreferenceService,
  ) {}

  async csv(userId: bigint, params: Record<string, string | undefined>) {
    const preference = await this.weatherPreferenceService.preferenceFor(userId);
    const cities = await this.citiesQueryService.filteredCities(userId, params, preference);
    const rows = cities.map((city) => {
      const snapshot = city.weatherSnapshots[0];
      return {
        "都市": safeCsvValue(city.name),
        "国": safeCsvValue(city.country),
        "緯度": Number(city.latitude),
        "経度": Number(city.longitude),
        "現在気温": this.numberOrNull(snapshot?.currentTemperature),
        "湿度": snapshot?.currentHumidity ?? null,
        "降水量": this.numberOrNull(snapshot?.currentPrecipitation),
        "風速": this.numberOrNull(snapshot?.currentWindSpeed),
        "US AQI": this.numberOrNull(snapshot?.currentUsAqi),
        "快適度スコア": scoreFor(preference, snapshot ?? null),
        "取得日時": snapshot?.fetchedAt ?? null,
      };
    });
    return `\uFEFF${stringify(rows, { header: true })}`;
  }

  private numberOrNull(value: unknown) {
    return value === null || value === undefined ? null : Number(value);
  }
}
