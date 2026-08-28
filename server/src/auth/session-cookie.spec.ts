import { AUTH_COOKIE_NAME, readSessionCookie, sessionCookieOptions } from "./session-cookie";

describe("session cookie", () => {
  it("reads the application session from a cookie header", () => {
    expect(readSessionCookie(`other=value; ${AUTH_COOKIE_NAME}=signed%2Btoken`)).toBe("signed+token");
  });

  it("returns null for missing or malformed cookies", () => {
    expect(readSessionCookie(undefined)).toBeNull();
    expect(readSessionCookie("other=value")).toBeNull();
    expect(readSessionCookie(`${AUTH_COOKIE_NAME}=%`)).toBeNull();
  });

  it("uses Secure only for production deployments", () => {
    expect(sessionCookieOptions(false)).toEqual(expect.objectContaining({ httpOnly: true, secure: false, sameSite: "lax", path: "/" }));
    expect(sessionCookieOptions(true)).toEqual(expect.objectContaining({ httpOnly: true, secure: true }));
  });
});
