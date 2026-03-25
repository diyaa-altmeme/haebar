import { handleApiError, ok } from "@/lib/api/http";
import { requireApiSession } from "@/lib/auth/api";
import { listBoxBalancesForPeriod } from "@/lib/services/box-balances";

export async function GET(request: Request) {
  try {
    await requireApiSession(["admin", "manager", "data_entry"]);
    const { searchParams } = new URL(request.url);
    const month = Number(searchParams.get("month"));
    const year = Number(searchParams.get("year"));

    if (!month || !year) {
      throw Object.assign(new Error("يجب تمرير الشهر والسنة."), { status: 400 });
    }

    const balances = await listBoxBalancesForPeriod(month, year);
    return ok(balances);
  } catch (error) {
    return handleApiError(error);
  }
}
