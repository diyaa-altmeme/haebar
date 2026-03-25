import { handleApiError, ok } from "@/lib/api/http";
import { clearSessionCookies, getRefreshTokenFromCookies } from "@/lib/auth/session";
import { revokeRefreshToken } from "@/lib/services/auth";

export async function POST() {
  try {
    const refreshToken = await getRefreshTokenFromCookies();
    await revokeRefreshToken(refreshToken);
    await clearSessionCookies();
    return ok({ success: true });
  } catch (error) {
    return handleApiError(error);
  }
}
