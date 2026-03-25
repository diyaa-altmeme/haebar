import { handleApiError, ok } from "@/lib/api/http";
import { requireApiSession } from "@/lib/auth/api";
import { getDashboardSummary } from "@/lib/services/dashboard";

export async function GET(request: Request) {
  try {
    await requireApiSession(["admin", "manager", "data_entry"]);
    const { searchParams } = new URL(request.url);
    const month = Number(searchParams.get("month"));
    const year = Number(searchParams.get("year"));
    const summary = await getDashboardSummary(month, year);
    return ok(summary);
  } catch (error) {
    return handleApiError(error);
  }
}
