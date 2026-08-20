import { ConfigService } from "@nestjs/config";

import { RouteRequestError, RouteClient } from "./route.client";

describe("RouteClient", () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  const from = { latitude: 35.6762, longitude: 139.6503 };
  const to = { latitude: 35.0116, longitude: 135.7681 };

  const client = () => new RouteClient({ get: jest.fn().mockReturnValue("https://router.example.com") } as unknown as ConfigService);

  it("returns the first valid driving route", async () => {
    jest.spyOn(global, "fetch").mockResolvedValue({
      ok: true,
      json: async () => ({ code: "Ok", routes: [{ duration: 4_200, distance: 450_000 }] }),
    } as Response);

    await expect(client().routeFor(from, to)).resolves.toEqual({ durationSeconds: 4_200, distanceMeters: 450_000 });
  });

  it("rejects routes beyond the weather forecast window", async () => {
    jest.spyOn(global, "fetch").mockResolvedValue({
      ok: true,
      json: async () => ({ code: "Ok", routes: [{ duration: 7 * 24 * 60 * 60 + 1, distance: 12_000_000 }] }),
    } as Response);

    await expect(client().routeFor(from, to))
      .rejects
      .toEqual(new RouteRequestError("この車移動は7日予報の範囲を超えるため、到着時の天気を確認できません。近い都市間で試してください。"));
  });
});
