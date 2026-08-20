import type { CookieOptions } from "express";

export const AUTH_COOKIE_NAME = "weather-compare-session";
export const AUTH_COOKIE_MAX_AGE_MS = 14 * 24 * 60 * 60 * 1000;

export function sessionCookieOptions(secure: boolean): CookieOptions {
  return {
    httpOnly: true,
    secure,
    sameSite: "lax",
    path: "/",
    maxAge: AUTH_COOKIE_MAX_AGE_MS,
  };
}

export function sessionClearCookieOptions(secure: boolean): CookieOptions {
  const { maxAge: _maxAge, ...options } = sessionCookieOptions(secure);
  return options;
}

export function readSessionCookie(cookieHeader: string | undefined) {
  if (!cookieHeader) return null;

  const cookie = cookieHeader.split(";").map((part) => part.trim()).find((part) => part.startsWith(`${AUTH_COOKIE_NAME}=`));
  if (!cookie) return null;

  try {
    return decodeURIComponent(cookie.slice(AUTH_COOKIE_NAME.length + 1));
  } catch {
    return null;
  }
}
