import type { CookieOptions, Request, Response } from "express";

const JWT_EXPIRES_MS = 7 * 24 * 60 * 60 * 1000;

export const AUTH_COOKIE_NAME =
  process.env.AUTH_COOKIE_NAME || "devverify_token";

const getSameSite = (): CookieOptions["sameSite"] => {
  const raw = (process.env.AUTH_COOKIE_SAME_SITE || "").toLowerCase();

  if (raw === "strict") return "strict";
  if (raw === "none") return "none";
  if (raw === "lax") return "lax";

  return process.env.NODE_ENV === "production" ? "none" : "lax";
};

export const getAuthCookieOptions = (): CookieOptions => {
  const sameSite = getSameSite();
  const isSecure = process.env.NODE_ENV === "production" || sameSite === "none";
  const domain = process.env.AUTH_COOKIE_DOMAIN?.trim() || undefined;

  return {
    httpOnly: true,
    secure: isSecure,
    sameSite,
    maxAge: JWT_EXPIRES_MS,
    path: "/",
    domain,
  };
};

export const setAuthCookie = (res: Response, token: string): void => {
  res.cookie(AUTH_COOKIE_NAME, token, getAuthCookieOptions());
};

export const clearAuthCookie = (res: Response): void => {
  res.clearCookie(AUTH_COOKIE_NAME, {
    ...getAuthCookieOptions(),
    maxAge: undefined,
    expires: new Date(0),
  });
};

const parseCookies = (
  rawCookieHeader: string | undefined,
): Record<string, string> => {
  if (!rawCookieHeader) return {};

  return rawCookieHeader
    .split(";")
    .map((part) => part.trim())
    .filter(Boolean)
    .reduce<Record<string, string>>((acc, pair) => {
      const separatorIndex = pair.indexOf("=");
      if (separatorIndex <= 0) return acc;

      const key = pair.slice(0, separatorIndex).trim();
      const value = pair.slice(separatorIndex + 1).trim();

      if (!key) return acc;

      acc[key] = decodeURIComponent(value);
      return acc;
    }, {});
};

export const getTokenFromRequest = (req: Request): string | null => {
  const authHeader = req.headers.authorization;

  if (authHeader?.startsWith("Bearer ")) {
    const bearer = authHeader.split(" ")[1]?.trim();
    if (bearer) return bearer;
  }

  const cookies = parseCookies(req.headers.cookie);
  const tokenFromCookie = cookies[AUTH_COOKIE_NAME];

  return tokenFromCookie || null;
};
