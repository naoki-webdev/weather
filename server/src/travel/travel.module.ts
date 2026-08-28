import { Module } from "@nestjs/common";

import { AuthModule } from "../auth/auth.module";
import { WeatherModule } from "../weather/weather.module";
import { RouteClient } from "./route.client";
import { TravelController } from "./travel.controller";
import { TravelService } from "./travel.service";

@Module({
  imports: [AuthModule, WeatherModule],
  controllers: [TravelController],
  providers: [RouteClient, TravelService],
})
export class TravelModule {}
