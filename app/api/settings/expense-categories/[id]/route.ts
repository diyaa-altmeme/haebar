import { handleApiError, ok } from "@/lib/api/http";
import { requireApiSession } from "@/lib/auth/api";
import { updateExpenseCategory } from "@/lib/services/settings";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function PUT(request: Request, context: RouteContext) {
  try {
    const session = await requireApiSession(["admin", "manager"]);
    const { id } = await context.params;
    const payload = await request.json();
    const category = await updateExpenseCategory(id, payload, session.id);
    return ok(category);
  } catch (error) {
    return handleApiError(error);
  }
}
