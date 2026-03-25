import { z } from "zod";

import { created, handleApiError, ok } from "@/lib/api/http";
import { loginUser, issueRefreshToken } from "@/lib/services/auth";
import { setSessionCookies, signAccessToken } from "@/lib/auth/session";

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6)
});

export async function POST(request: Request) {
  try {
    const payload = loginSchema.parse(await request.json());
    const user = await loginUser(payload.email, payload.password);
    const accessToken = await signAccessToken(user);
    const refreshToken = await issueRefreshToken(user.id);

    await setSessionCookies({ accessToken, refreshToken });

    return created({ user });
  } catch (error) {
    return handleApiError(error);
  }
}
