import { handleApiError, ok } from "@/lib/api/http";
import { getRefreshTokenFromCookies, setSessionCookies, signAccessToken } from "@/lib/auth/session";
import { rotateRefreshToken } from "@/lib/services/auth";

export async function POST() {
  try {
    const refreshToken = await getRefreshTokenFromCookies();

    if (!refreshToken) {
      throw Object.assign(new Error("لا توجد جلسة تحديث متاحة."), { status: 401 });
    }

    const { user, refreshToken: nextRefreshToken } = await rotateRefreshToken(refreshToken);
    const accessToken = await signAccessToken(user);
    await setSessionCookies({
      accessToken,
      refreshToken: nextRefreshToken
    });

    return ok({ user });
  } catch (error) {
    return handleApiError(error);
  }
}
