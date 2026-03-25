import { handleApiError, ok } from "@/lib/api/http";
import { requireApiSession } from "@/lib/auth/api";
import { createUser, listUsers } from "@/lib/services/users";

export async function GET() {
  try {
    await requireApiSession(["admin"]);
    const users = await listUsers();
    return ok(users);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: Request) {
  try {
    const session = await requireApiSession(["admin"]);
    const payload = await request.json();
    const user = await createUser(payload, session.id);
    return ok(user, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
