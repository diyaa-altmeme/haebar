import { handleApiError, ok } from "@/lib/api/http";
import { requireApiSession } from "@/lib/auth/api";
import { createExpenseCategory, listExpenseCategories } from "@/lib/services/settings";

export async function GET() {
  try {
    await requireApiSession(["admin", "manager", "data_entry"]);
    const categories = await listExpenseCategories();
    return ok(categories);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: Request) {
  try {
    const session = await requireApiSession(["admin", "manager"]);
    const payload = await request.json();
    const category = await createExpenseCategory(payload, session.id);
    return ok(category, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
