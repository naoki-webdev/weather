import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { APP_GUARD } from "@nestjs/core";
import { ThrottlerGuard, ThrottlerModule } from "@nestjs/throttler";

import { AuthModule } from "./auth/auth.module";
import { CitiesModule } from "./cities/cities.module";
import { HealthController } from "./health.controller";
import { PreferencesModule } from "./preferences/preferences.module";
import { SessionController } from "./session.controller";
import { TravelModule } from "./travel/travel.module";
import { WeatherModule } from "./weather/weather.module";

@Module({
  imports: [
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 600 }]),
    ConfigModule.forRoot({
      isGlobal: true,
      validate: (config) => {
        if (!config.JWT_SECRET?.trim()) throw new Error("JWT_SECRET must be configured before starting the server.");
        return config;
      },
    }),
    AuthModule,
    WeatherModule,
    CitiesModule,
    PreferencesModule,
    TravelModule,
  ],
  providers: [{ provide: APP_GUARD, useClass: ThrottlerGuard }],
  controllers: [HealthController, SessionController],
})
export class AppModule {}
