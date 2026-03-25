import { handleApiError, ok } from "@/lib/api/http";
import { requireApiSession } from "@/lib/auth/api";
import { getActiveMonth, setActiveMonth } from "@/lib/services/settings";

export async function GET() {
  try {
    await requireApiSession(["admin", "manager", "data_entry"]);
    const month = await getActiveMonth();
    return ok(month);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PUT(request: Request) {
  try {
    const session = await requireApiSession(["admin", "manager"]);
    const payload = await request.json();
    const month = await setActiveMonth(payload, session.id);
    return ok(month);
  } catch (error) {
    return handleApiError(error);
  }
}
