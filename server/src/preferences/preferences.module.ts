import { Module } from "@nestjs/common";

import { AuthModule } from "../auth/auth.module";
import { CitiesModule } from "../cities/cities.module";
import { PreferencesController } from "./preferences.controller";

@Module({
  imports: [AuthModule, CitiesModule],
  controllers: [PreferencesController],
})
export class PreferencesModule {}
