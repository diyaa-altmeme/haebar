import { handleApiError, ok } from "@/lib/api/http";
import { requireApiSession } from "@/lib/auth/api";
import { deleteSale, getSaleById, updateSale } from "@/lib/services/sales";

type RouteContext = {
  params: Promise<{
    saleId: string;
  }>;
};

export async function GET(_request: Request, context: RouteContext) {
  try {
    await requireApiSession(["admin", "manager", "data_entry"]);
    const { saleId } = await context.params;
    const sale = await getSaleById(saleId);
    return ok(sale);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PUT(request: Request, context: RouteContext) {
  try {
    const session = await requireApiSession(["admin", "manager"]);
    const { saleId } = await context.params;
    const payload = await request.json();
    const sale = await updateSale(saleId, { ...payload, actorUserId: session.id });
    return ok(sale);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(request: Request, context: RouteContext) {
  try {
    const session = await requireApiSession(["admin", "manager"]);
    const { saleId } = await context.params;
    const body = await request.text();
    const actorUserId = body ? (JSON.parse(body).actorUserId as string | null | undefined) : null;
    const result = await deleteSale(saleId, actorUserId ?? session.id);
    return ok(result);
  } catch (error) {
    return handleApiError(error);
  }
}
