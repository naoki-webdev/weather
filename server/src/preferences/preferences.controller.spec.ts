import { ArgumentMetadata, ValidationPipe } from "@nestjs/common";

import { UpdateWeatherPreferenceDto } from "./preferences.controller";

describe("UpdateWeatherPreferenceDto", () => {
  const pipe = new ValidationPipe({ transform: true, whitelist: true });
  const metadata: ArgumentMetadata = { type: "body", metatype: UpdateWeatherPreferenceDto };

  it("rejects a non-numeric target temperature", async () => {
    await expect(pipe.transform({ weather_preference: { target_temperature: "not-a-number" } }, metadata)).rejects.toThrow();
  });

  it("rejects weights outside the UI-supported range", async () => {
    await expect(pipe.transform({ weather_preference: { temperature_weight: 11 } }, metadata)).rejects.toThrow();
  });
});
