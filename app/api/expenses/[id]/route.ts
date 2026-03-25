import { handleApiError, ok } from "@/lib/api/http";
import { requireApiSession } from "@/lib/auth/api";
import { deleteExpense, updateExpense } from "@/lib/services/expenses";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function PUT(request: Request, context: RouteContext) {
  try {
    const session = await requireApiSession(["admin", "manager"]);
    const { id } = await context.params;
    const payload = await request.json();
    const expense = await updateExpense(id, payload, session.id);
    return ok(expense);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  try {
    const session = await requireApiSession(["admin", "manager"]);
    const { id } = await context.params;
    const result = await deleteExpense(id, session.id);
    return ok(result);
  } catch (error) {
    return handleApiError(error);
  }
}
