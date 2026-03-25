import { handleApiError, ok } from "@/lib/api/http";
import { requireApiSession } from "@/lib/auth/api";
import { confirmTransfer } from "@/lib/services/transfers";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function PUT(_request: Request, context: RouteContext) {
  try {
    const session = await requireApiSession(["admin", "manager"]);
    const { id } = await context.params;
    const transfer = await confirmTransfer(id, session.id);
    return ok(transfer);
  } catch (error) {
    return handleApiError(error);
  }
}
