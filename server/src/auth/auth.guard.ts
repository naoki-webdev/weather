import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from "@nestjs/common";

import { AuthService } from "./auth.service";
import type { AuthenticatedRequest } from "./auth.types";
import { readSessionCookie } from "./session-cookie";

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(private readonly authService: AuthService) {}

  async canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const token = readSessionCookie(request.headers.cookie) ?? request.headers.authorization?.match(/^Bearer\s+(.+)$/i)?.[1];
    const user = token ? await this.authService.fromToken(token) : null;
    if (!user) throw new UnauthorizedException({ errors: ["認証が必要です。"] });

    request.user = user;
    request.authToken = token;
    return true;
  }
}
