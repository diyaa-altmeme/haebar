import { created, handleApiError, ok } from "@/lib/api/http";
import { requireApiSession } from "@/lib/auth/api";
import { createSale, listSales } from "@/lib/services/sales";

export async function GET(request: Request) {
  try {
    await requireApiSession(["admin", "manager", "data_entry"]);
    const { searchParams } = new URL(request.url);
    const month = Number(searchParams.get("month"));
    const year = Number(searchParams.get("year"));

    if (!month || !year) {
      throw Object.assign(new Error("يجب تمرير الشهر والسنة."), { status: 400 });
    }

    const sales = await listSales(month, year);
    return ok(sales);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: Request) {
  try {
    const session = await requireApiSession(["admin", "manager", "data_entry"]);
    const payload = await request.json();
    const sale = await createSale({ ...payload, actorUserId: session.id });
    return created(sale);
  } catch (error) {
    return handleApiError(error);
  }
}
