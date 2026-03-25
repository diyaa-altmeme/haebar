import { handleApiError, ok } from "@/lib/api/http";
import { requireApiSession } from "@/lib/auth/api";

export async function GET() {
  try {
    const user = await requireApiSession();
    return ok({ user });
  } catch (error) {
    return handleApiError(error);
  }
}
