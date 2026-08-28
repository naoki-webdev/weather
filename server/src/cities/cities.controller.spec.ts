import { ArgumentMetadata, ValidationPipe } from "@nestjs/common";

import type { AuthenticatedRequest } from "../auth/auth.types";
import { CitiesController, CityInputDto, CreateCityDto, UpdateFavoriteDto } from "./cities.controller";
import { CityComparisonInputError, CityComparisonNotFoundError } from "./cities.errors";
import { CitiesQueryService } from "./cities.query.service";

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

  it("rejects a city without a name", async () => {
    const city: Record<keyof CityInputDto, unknown> = {
      external_id: "1",
      name: "",
      country: "日本",
      country_code: "JP",
      admin1: "東京都",
      latitude: 35.6762,
      longitude: 139.7,
      timezone: "Asia/Tokyo",
      source_name: "Open-Meteo",
    };

    await expect(pipe.transform({ city }, metadata)).rejects.toThrow();
  });
});

describe("CitiesController", () => {
  it("returns bad request for an invalid comparison size", async () => {
    const service = { compare: jest.fn().mockRejectedValue(new CityComparisonInputError("比較する都市を2～4件選択してください。")) } as unknown as CitiesQueryService;
    const controller = new CitiesController({} as never, service, {} as never);
    const request = { user: { id: 99n } } as AuthenticatedRequest;

    await expect(controller.compare(request, { ids: ["1"] })).rejects.toMatchObject({
      status: 400,
      response: { errors: ["比較する都市を2～4件選択してください。"] },
    });
  });

  it("returns not found when a comparison city is missing", async () => {
    const service = { compare: jest.fn().mockRejectedValue(new CityComparisonNotFoundError("比較対象の都市が見つかりません。")) } as unknown as CitiesQueryService;
    const controller = new CitiesController({} as never, service, {} as never);
    const request = { user: { id: 99n } } as AuthenticatedRequest;

    await expect(controller.compare(request, { ids: ["1", "2"] })).rejects.toMatchObject({
      status: 404,
      response: { errors: ["比較対象の都市が見つかりません。"] },
    });
  });

  it("does not expose unexpected comparison errors", async () => {
    const error = new Error("database connection details");
    const queryService = { compare: jest.fn().mockRejectedValue(error) } as unknown as CitiesQueryService;
    const controller = new CitiesController({} as never, queryService, {} as never);
    const request = { user: { id: 99n } } as AuthenticatedRequest;

    await expect(controller.compare(request, { ids: ["1", "2"] })).rejects.toBe(error);
  });
});
