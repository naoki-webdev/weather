import { CitiesService } from "./cities.service";
import type { PrismaService } from "../prisma.service";
import type { WeatherClient } from "../weather/weather.client";
import type { WeatherService } from "../weather/weather.service";
import type { CitiesQueryService } from "./cities.query.service";
import type { WeatherPreferenceService } from "./weather-preference.service";

describe("city workspace", () => {
  it("only restores the owner's city while the restore window is open", async () => {
    const updateMany = jest.fn().mockResolvedValue({ count:0 });
    const prisma = { city:{ updateMany } } as unknown as PrismaService;
    const service = new CitiesService(prisma,{} as WeatherClient,{} as WeatherService,{} as CitiesQueryService,{} as WeatherPreferenceService);
    expect(await service.restore(1n,2n)).toBeNull();
    expect(updateMany).toHaveBeenCalledWith({ where:{ id:2n,userId:1n,deletedAt:{ gte:expect.any(Date) } },data:{ deletedAt:null } });
  });
  it("returns only hourly forecasts that satisfy every condition and excludes missing data", async () => {
    const city = { id:2n, timezone:"Asia/Tokyo" };
    const prisma = { city:{ findFirst:jest.fn().mockResolvedValue(city) } } as unknown as PrismaService;
    const hourlyWeatherFor = jest.fn()
      .mockResolvedValue({ temperature:24,precipitation_probability:60,wind_speed:10 })
      .mockResolvedValueOnce({ temperature:24,precipitation_probability:10,wind_speed:10 })
      .mockResolvedValueOnce({ temperature:null,precipitation_probability:10,wind_speed:10 });
    const service = new CitiesService(prisma,{ hourlyWeatherFor } as unknown as WeatherClient,{} as WeatherService,{} as CitiesQueryService,{} as WeatherPreferenceService);
    const result = await service.weatherWindows(1n,2n,20,25,20);
    expect(result?.windows).toHaveLength(1);
    expect(result?.timezone).toBe("Asia/Tokyo");
    expect(prisma.city.findFirst).toHaveBeenCalledWith({ where:{ id:2n,userId:1n,deletedAt:null } });
  });
});
