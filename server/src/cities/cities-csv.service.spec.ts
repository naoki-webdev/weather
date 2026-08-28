import type { CitiesQueryService } from "./cities.query.service";
import { CitiesCsvService } from "./cities-csv.service";
import type { WeatherPreferenceService } from "./weather-preference.service";

describe("CitiesCsvService", () => {
  it("neutralizes formula-like city and country names in exported CSV", async () => {
    const citiesQueryService = {
      filteredCities: jest.fn().mockResolvedValue([{
        name: "=HYPERLINK(\"https://example.com\")",
        country: "@cmd",
        latitude: 35.6762,
        longitude: 139.6503,
        weatherSnapshots: [{
          currentTemperature: 20,
          currentHumidity: 50,
          currentPrecipitation: 0,
          currentWindSpeed: 2,
          currentUsAqi: 20,
          dailyData: { precipitation_probability_max: [0] },
          fetchedAt: new Date("2026-08-20T00:00:00.000Z"),
        }],
      }]),
    } as unknown as CitiesQueryService;
    const weatherPreferenceService = {
      preferenceFor: jest.fn().mockResolvedValue({
        targetTemperature: 20,
        temperatureWeight: 1,
        precipitationWeight: 1,
        humidityWeight: 1,
        windWeight: 1,
        airQualityWeight: 1,
      }),
    } as unknown as WeatherPreferenceService;
    const service = new CitiesCsvService(citiesQueryService, weatherPreferenceService);

    const csv = await service.csv(1n, {});

    expect(csv).toContain("'=HYPERLINK");
    expect(csv).toContain("'@cmd");
    expect(weatherPreferenceService.preferenceFor).toHaveBeenCalledTimes(1);
    expect(citiesQueryService.filteredCities).toHaveBeenCalledWith(1n, {}, expect.any(Object));
  });
});
