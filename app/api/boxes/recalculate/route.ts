import { handleApiError, ok } from "@/lib/api/http";
import { requireApiSession } from "@/lib/auth/api";
import { invalidateFinancialPeriodCaches } from "@/lib/cache/financial";
import { prisma } from "@/lib/db/prisma";
import { recalculateBoxBalancesForPeriod } from "@/lib/services/box-balances";

export async function POST(request: Request) {
  try {
    const session = await requireApiSession(["admin", "manager"]);
    const payload = (await request.json()) as {
      month?: number;
      year?: number;
      actorUserId?: string | null;
      note?: string;
    };

    if (!payload.month || !payload.year) {
      throw Object.assign(new Error("يجب تمرير الشهر والسنة."), { status: 400 });
    }

    const result = await prisma.$transaction((tx) =>
      recalculateBoxBalancesForPeriod(tx, {
        month: payload.month!,
        year: payload.year!,
        actorUserId: payload.actorUserId ?? session.id,
        createRun: true,
        note: payload.note
      })
    );

    await invalidateFinancialPeriodCaches([{ month: payload.month!, year: payload.year! }]);

    return ok(result);
  } catch (error) {
    return handleApiError(error);
  }
}
