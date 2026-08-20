import { ArgumentMetadata, ValidationPipe } from "@nestjs/common";

import { CityInputDto, CreateCityDto, UpdateFavoriteDto } from "./cities.controller";

describe("UpdateFavoriteDto", () => {
  const pipe = new ValidationPipe({ transform: true, whitelist: true });
  const metadata: ArgumentMetadata = { type: "body", metatype: UpdateFavoriteDto };

  it("rejects a missing city wrapper", async () => {
    await expect(pipe.transform({}, metadata)).rejects.toThrow();
  });

  it("rejects a missing favorite value", async () => {
    await expect(pipe.transform({ city: {} }, metadata)).rejects.toThrow();
  });
});

describe("CreateCityDto", () => {
  const pipe = new ValidationPipe({ transform: true, whitelist: true });
  const metadata: ArgumentMetadata = { type: "body", metatype: CreateCityDto };

  it("rejects coordinates outside the valid geographic range", async () => {
    const city: Record<keyof CityInputDto, unknown> = {
      external_id: "1",
      name: "東京",
      country: "日本",
      country_code: "JP",
      admin1: "東京都",
      latitude: 91,
      longitude: 139.7,
      timezone: "Asia/Tokyo",
      source_name: "Open-Meteo",
    };

    await expect(pipe.transform({ city }, metadata)).rejects.toThrow();
  });
});
