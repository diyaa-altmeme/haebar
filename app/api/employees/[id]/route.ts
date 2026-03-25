import { handleApiError, ok } from "@/lib/api/http";
import { requireApiSession } from "@/lib/auth/api";
import { updateEmployee } from "@/lib/services/employees";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function PUT(request: Request, context: RouteContext) {
  try {
    const session = await requireApiSession(["admin", "manager"]);
    const { id } = await context.params;
    const payload = await request.json();
    const employee = await updateEmployee(id, payload, session.id);
    return ok(employee);
  } catch (error) {
    return handleApiError(error);
  }
}
