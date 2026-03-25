import { handleApiError, ok } from "@/lib/api/http";
import { requireApiSession } from "@/lib/auth/api";
import { deleteUser, updateUser } from "@/lib/services/users";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const session = await requireApiSession(["admin"]);
    const { id } = await context.params;
    const payload = await request.json();
    const user = await updateUser(id, payload, session.id);
    return ok(user);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  try {
    const session = await requireApiSession(["admin"]);
    const { id } = await context.params;
    const result = await deleteUser(id, session.id);
    return ok(result);
  } catch (error) {
    return handleApiError(error);
  }
}
