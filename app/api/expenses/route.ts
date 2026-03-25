import { handleApiError, ok } from "@/lib/api/http";
import { requireApiSession } from "@/lib/auth/api";
import { createExpense, listExpenses } from "@/lib/services/expenses";

export async function GET(request: Request) {
  try {
    await requireApiSession(["admin", "manager", "data_entry"]);
    const { searchParams } = new URL(request.url);
    const month = Number(searchParams.get("month"));
    const year = Number(searchParams.get("year"));
    const category = searchParams.get("category");
    const box = searchParams.get("box");
    const expenses = await listExpenses(month, year, category, box);
    return ok(expenses);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: Request) {
  try {
    const session = await requireApiSession(["admin", "manager", "data_entry"]);
    const payload = await request.json();
    const expense = await createExpense(payload, session.id);
    return ok(expense, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
