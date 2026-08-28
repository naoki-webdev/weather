import { UnauthorizedException } from "@nestjs/common";

import type { AuthenticatedRequest } from "./auth.types";
import { AuthGuard } from "./auth.guard";

describe("AuthGuard", () => {
  it("authenticates with the HttpOnly session cookie before checking bearer headers", async () => {
    const user = { id: 1n } as never;
    const authService = { fromToken: jest.fn().mockResolvedValue(user) };
    const request = { headers: { cookie: "weather-compare-session=cookie-token", authorization: "Bearer stale-token" } } as unknown as AuthenticatedRequest;
    const context = { switchToHttp: () => ({ getRequest: () => request }) } as never;

    await expect(new AuthGuard(authService as never).canActivate(context)).resolves.toBe(true);
    expect(authService.fromToken).toHaveBeenCalledWith("cookie-token");
    expect(request.user).toBe(user);
    expect(request.authToken).toBe("cookie-token");
  });

  it("rejects requests without a valid session", async () => {
    const authService = { fromToken: jest.fn().mockResolvedValue(null) };
    const context = { switchToHttp: () => ({ getRequest: () => ({ headers: {} }) }) } as never;

    await expect(new AuthGuard(authService as never).canActivate(context)).rejects.toBeInstanceOf(UnauthorizedException);
  });
});
