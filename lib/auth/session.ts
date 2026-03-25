import { cookies } from "next/headers";
import { SignJWT, jwtVerify, type JWTPayload } from "jose";

const ACCESS_COOKIE = "haebar_access_token";
const REFRESH_COOKIE = "haebar_refresh_token";

type AppRole = "admin" | "manager" | "data_entry";

export type SessionUser = {
  id: string;
  name: string;
  email: string;
  role: AppRole;
};

type SessionPayload = JWTPayload & {
  sub: string;
  role: AppRole;
  name: string;
  email: string;
};

function getAccessSecret() {
  return new TextEncoder().encode(process.env.AUTH_ACCESS_SECRET ?? "dev-access-secret-change-me");
}

function getRefreshSecret() {
  return new TextEncoder().encode(process.env.AUTH_REFRESH_SECRET ?? "dev-refresh-secret-change-me");
}

export async function signAccessToken(user: SessionUser) {
  return new SignJWT({
    role: user.role,
    name: user.name,
    email: user.email
  })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(user.id)
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(getAccessSecret());
}

export async function signRefreshToken(userId: string) {
  return new SignJWT({})
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(userId)
    .setIssuedAt()
    .setExpirationTime("30d")
    .sign(getRefreshSecret());
}

export async function verifyAccessToken(token: string) {
  const { payload } = await jwtVerify(token, getAccessSecret());
  return payload as SessionPayload;
}

export async function verifyRefreshToken(token: string) {
  const { payload } = await jwtVerify(token, getRefreshSecret());
  return payload as SessionPayload;
}

export async function setSessionCookies(input: { accessToken: string; refreshToken: string }) {
  const cookieStore = await cookies();
  // In AI Studio preview (iframe), we need SameSite=None and Secure=true
  // Even in development, the preview is served over HTTPS
  const secure = true;

  cookieStore.set(ACCESS_COOKIE, input.accessToken, {
    httpOnly: true,
    sameSite: "none",
    secure,
    path: "/",
    maxAge: 60 * 60 * 24 * 7
  });

  cookieStore.set(REFRESH_COOKIE, input.refreshToken, {
    httpOnly: true,
    sameSite: "none",
    secure,
    path: "/",
    maxAge: 60 * 60 * 24 * 30
  });
}

export async function clearSessionCookies() {
  const cookieStore = await cookies();
  cookieStore.delete(ACCESS_COOKIE);
  cookieStore.delete(REFRESH_COOKIE);
}

export async function getAccessTokenFromCookies() {
  const cookieStore = await cookies();
  return cookieStore.get(ACCESS_COOKIE)?.value ?? null;
}

export async function getRefreshTokenFromCookies() {
  const cookieStore = await cookies();
  return cookieStore.get(REFRESH_COOKIE)?.value ?? null;
}

export async function getSessionUser() {
  const accessToken = await getAccessTokenFromCookies();
  if (!accessToken) {
    return null;
  }

  try {
    const payload = await verifyAccessToken(accessToken);
    return {
      id: payload.sub,
      name: payload.name,
      email: payload.email,
      role: payload.role
    } satisfies SessionUser;
  } catch {
    return null;
  }
}

export function getSessionCookieNames() {
  return {
    access: ACCESS_COOKIE,
    refresh: REFRESH_COOKIE
  };
}
