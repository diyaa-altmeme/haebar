import { getSessionUser, type SessionUser } from "@/lib/auth/session";

type AllowedRole = SessionUser["role"];

export async function requireApiSession(allowedRoles?: AllowedRole[]) {
  const user = await getSessionUser();

  if (!user) {
    throw createAuthError("يجب تسجيل الدخول أولاً.", 401);
  }

  if (allowedRoles && allowedRoles.length > 0 && !allowedRoles.includes(user.role)) {
    throw createAuthError("لا تملك الصلاحية لتنفيذ هذا الإجراء.", 403);
  }

  return user;
}

function createAuthError(message: string, status: number) {
  const error = new Error(message) as Error & { status?: number };
  error.status = status;
  return error;
}
