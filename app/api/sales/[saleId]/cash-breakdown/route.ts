import { handleApiError, ok } from "@/lib/api/http";
import { requireApiSession } from "@/lib/auth/api";
import { getCashBreakdownBySaleId } from "@/lib/services/sales";

type RouteContext = {
  params: Promise<{
    saleId: string;
  }>;
};

export async function GET(_request: Request, context: RouteContext) {
  try {
    await requireApiSession(["admin", "manager", "data_entry"]);
    const { saleId } = await context.params;
    const breakdown = await getCashBreakdownBySaleId(saleId);
    return ok(breakdown);
  } catch (error) {
    return handleApiError(error);
  }
}
