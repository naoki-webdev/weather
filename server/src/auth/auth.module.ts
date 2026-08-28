import { Module } from "@nestjs/common";

import { PrismaService } from "../prisma.service";
import { AuthGuard } from "./auth.guard";
import { AuthService } from "./auth.service";
import { ReadOnlyGuard } from "./readonly.guard";

@Module({
  providers: [PrismaService, AuthService, AuthGuard, ReadOnlyGuard],
  exports: [PrismaService, AuthService, AuthGuard, ReadOnlyGuard],
})
export class AuthModule {}
