import { handleApiError, ok } from "@/lib/api/http";
import { requireApiSession } from "@/lib/auth/api";
import { createEmployee, listEmployees } from "@/lib/services/employees";

export async function GET() {
  try {
    await requireApiSession(["admin", "manager"]);
    const employees = await listEmployees();
    return ok(employees);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: Request) {
  try {
    const session = await requireApiSession(["admin"]);
    const payload = await request.json();
    const employee = await createEmployee(payload, session.id);
    return ok(employee, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
