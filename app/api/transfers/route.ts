import { handleApiError, ok } from "@/lib/api/http";
import { requireApiSession } from "@/lib/auth/api";
import { createTransfer, listTransfers } from "@/lib/services/transfers";

export async function GET(request: Request) {
  try {
    await requireApiSession(["admin", "manager", "data_entry"]);
    const { searchParams } = new URL(request.url);
    const month = Number(searchParams.get("month"));
    const year = Number(searchParams.get("year"));
    const transfers = await listTransfers(month, year);
    return ok(transfers);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: Request) {
  try {
    const session = await requireApiSession(["admin", "manager"]);
    const payload = await request.json();
    const transfer = await createTransfer(payload, session.id);
    return ok(transfer, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
