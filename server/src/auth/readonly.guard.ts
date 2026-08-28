import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from "@nestjs/common";

import type { AuthenticatedRequest } from "./auth.types";

@Injectable()
export class ReadOnlyGuard implements CanActivate {
  canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    if (["GET", "HEAD", "OPTIONS"].includes(request.method)) return true;
    if (request.user.readOnly) {
      throw new ForbiddenException({ errors: ["デモユーザーは閲覧専用です。"] });
    }
    return true;
  }
}
