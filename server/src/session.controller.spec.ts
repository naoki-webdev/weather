import { ArgumentMetadata, ValidationPipe } from "@nestjs/common";

import { CreateSessionDto, SessionController } from "./session.controller";

describe("SessionController", () => {
  it("rejects a missing session wrapper before the controller accesses it", async () => {
    const pipe = new ValidationPipe({ transform: true, whitelist: true });
    const metadata: ArgumentMetadata = { type: "body", metatype: CreateSessionDto };

    await expect(pipe.transform({}, metadata)).rejects.toThrow();
  });

  it("revokes the authenticated token on logout", async () => {
    const authService = { revokeToken: jest.fn().mockResolvedValue(undefined) };
    const controller = new SessionController(authService as never);
    const response = { clearCookie: jest.fn() };

    await controller.destroy({ authToken: "token-to-revoke" } as never, response as never);

    expect(authService.revokeToken).toHaveBeenCalledWith("token-to-revoke");
    expect(response.clearCookie).toHaveBeenCalledWith(
      "weather-compare-session",
      expect.objectContaining({ httpOnly: true, sameSite: "lax", path: "/" }),
    );
  });

  it("sets an HttpOnly session cookie without returning the token to the browser", async () => {
    const authService = {
      authenticate: jest.fn().mockResolvedValue({ user: { id: 1 }, token: "server-session-token" }),
    };
    const controller = new SessionController(authService as never);
    const response = { cookie: jest.fn() };

    await expect(controller.create({ session: { email: "demo@example.com", password: "password" } }, response as never)).resolves.toEqual({ user: { id: 1 } });

    expect(response.cookie).toHaveBeenCalledWith(
      "weather-compare-session",
      "server-session-token",
      expect.objectContaining({ httpOnly: true, sameSite: "lax", path: "/" }),
    );
  });
});
