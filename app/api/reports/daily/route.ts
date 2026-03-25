import { handleApiError, ok } from "@/lib/api/http";
import { requireApiSession } from "@/lib/auth/api";
import { getDailyReport } from "@/lib/services/reports";

export async function GET(request: Request) {
  try {
    await requireApiSession(["admin", "manager"]);
    const { searchParams } = new URL(request.url);
    const month = Number(searchParams.get("month"));
    const year = Number(searchParams.get("year"));
    const data = await getDailyReport(month, year);
    return ok(data);
  } catch (error) {
    return handleApiError(error);
  }
}
