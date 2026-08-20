import { Body, Controller, Delete, Get, HttpCode, HttpException, HttpStatus, Post, Req, Res, UseGuards } from "@nestjs/common";
import { IsEmail, IsString, MinLength, ValidateNested } from "class-validator";
import { Type } from "class-transformer";
import type { Response } from "express";
import { Throttle } from "@nestjs/throttler";

import { AuthGuard } from "./auth/auth.guard";
import { AuthService } from "./auth/auth.service";
import type { AuthenticatedRequest } from "./auth/auth.types";
import { AUTH_COOKIE_NAME, sessionClearCookieOptions, sessionCookieOptions } from "./auth/session-cookie";

class SessionInput {
  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(1)
  password!: string;
}

class CreateSessionDto {
  @ValidateNested()
  @Type(() => SessionInput)
  session!: SessionInput;
}

const LOGIN_RATE_LIMIT = process.env.NODE_ENV === "test" ? 30 : 5;

@Controller("api/session")
export class SessionController {
  constructor(private readonly authService: AuthService) {}

  @Post()
  @Throttle({ default: { limit: LOGIN_RATE_LIMIT, ttl: 60_000 } })
  async create(@Body() body: CreateSessionDto, @Res({ passthrough: true }) response: Response) {
    const session = await this.authService.authenticate(body.session.email, body.session.password);
    if (!session) {
      throw new HttpException({ errors: ["メールアドレスまたはパスワードが正しくありません。"] }, HttpStatus.UNAUTHORIZED);
    }
    response.cookie(AUTH_COOKIE_NAME, session.token, sessionCookieOptions(this.isProduction()));
    return { user: session.user };
  }

  @Get()
  @UseGuards(AuthGuard)
  show(@Req() request: AuthenticatedRequest) {
    return { user: this.authService.publicUser(request.user) };
  }

  @Delete()
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(AuthGuard)
  async destroy(@Req() request: AuthenticatedRequest, @Res({ passthrough: true }) response: Response) {
    await this.authService.revokeToken(request.authToken ?? "");
    response.clearCookie(AUTH_COOKIE_NAME, sessionClearCookieOptions(this.isProduction()));
  }

  private isProduction() {
    return process.env.NODE_ENV === "production";
  }
}
