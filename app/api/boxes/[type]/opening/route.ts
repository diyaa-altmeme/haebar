import { handleApiError, ok } from "@/lib/api/http";
import { requireApiSession } from "@/lib/auth/api";
import { invalidateFinancialPeriodCaches } from "@/lib/cache/financial";
import { prisma } from "@/lib/db/prisma";
import { setBoxOpeningBalance } from "@/lib/services/box-balances";

type RouteContext = {
  params: Promise<{ type: string }>;
};

export async function PUT(request: Request, context: RouteContext) {
  try {
    const session = await requireApiSession(["admin", "manager"]);
    const { type } = await context.params;
    const body = (await request.json()) as { month: number; year: number; openingBalance: string | number };

    const id = await prisma.$transaction((tx) =>
      setBoxOpeningBalance(tx, type as "cash" | "master" | "swish" | "sagi" | "other_elec" | "bank", Number(body.month), Number(body.year), String(body.openingBalance), session.id)
    );

    await invalidateFinancialPeriodCaches([{ month: Number(body.month), year: Number(body.year) }]);

    return ok({ id });
  } catch (error) {
    return handleApiError(error);
  }
}
