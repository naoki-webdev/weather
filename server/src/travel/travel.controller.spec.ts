import { HttpException, HttpStatus } from "@nestjs/common";

import type { AuthenticatedRequest } from "../auth/auth.types";
import { ForecastOutOfRangeError } from "../weather/weather.client";
import { TravelService } from "./travel.service";
import { TravelController } from "./travel.controller";

describe("TravelController", () => {
  it("returns an unprocessable entity when arrival is outside the forecast range", async () => {
    const message = "到着予定時刻が予報対象期間外です。7日以内の到着予定を指定してください。";
    const service = { plan: jest.fn().mockRejectedValue(new ForecastOutOfRangeError(message)) } as unknown as TravelService;
    const controller = new TravelController(service);
    const request = { user: { id: 99n } } as AuthenticatedRequest;

    try {
      await controller.plan(request, "1", "2");
      throw new Error("Expected TravelController.plan to reject");
    } catch (error) {
      expect(error).toBeInstanceOf(HttpException);
      expect((error as HttpException).getStatus()).toBe(HttpStatus.UNPROCESSABLE_ENTITY);
      expect((error as HttpException).getResponse()).toEqual({ errors: [message] });
    }
  });

  it("rejects an invalid departure window", async () => {
    const service = { bestDeparture: jest.fn() } as unknown as TravelService;
    const controller = new TravelController(service);
    const request = { user: { id: 99n } } as AuthenticatedRequest;

    try {
      await controller.bestDeparture(request, "1", "2", "2026-08-20T10:00:00.000Z", "2026-08-20T09:00:00.000Z");
      throw new Error("Expected TravelController.bestDeparture to reject");
    } catch (error) {
      expect(error).toBeInstanceOf(HttpException);
      expect((error as HttpException).getStatus()).toBe(HttpStatus.BAD_REQUEST);
      expect((error as HttpException).getResponse()).toEqual({ errors: ["出発可能時間の形式が正しくありません。"] });
      expect(service.bestDeparture).not.toHaveBeenCalled();
    }
  });
});
