import { Module } from "@nestjs/common";
import { ScheduleModule } from "@nestjs/schedule";

import { AuthModule } from "../auth/auth.module";
import { WeatherClient } from "./weather.client";
import { WeatherScheduler } from "./weather.scheduler";
import { WeatherService } from "./weather.service";

@Module({
  imports: [AuthModule, ScheduleModule.forRoot()],
  providers: [WeatherClient, WeatherService, WeatherScheduler],
  exports: [WeatherClient, WeatherService],
})
export class WeatherModule {}
