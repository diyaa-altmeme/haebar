import { handleApiError, ok } from "@/lib/api/http";
import { requireApiSession } from "@/lib/auth/api";
import { employeeSales } from "@/lib/services/employees";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(request: Request, context: RouteContext) {
  try {
    await requireApiSession(["admin", "manager"]);
    const { searchParams } = new URL(request.url);
    const month = Number(searchParams.get("month"));
    const year = Number(searchParams.get("year"));
    const { id } = await context.params;
    const data = await employeeSales(id, month, year);
    return ok(data);
  } catch (error) {
    return handleApiError(error);
  }
}
