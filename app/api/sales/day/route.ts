import { handleApiError, ok } from "@/lib/api/http";
import { requireApiSession } from "@/lib/auth/api";
import { prisma } from "@/lib/db/prisma";

export async function GET(request: Request) {
  try {
    await requireApiSession(["admin", "manager"]);
    const { searchParams } = new URL(request.url);
    const date = searchParams.get("date");

    if (!date) {
      throw Object.assign(new Error("يجب تمرير التاريخ."), { status: 400 });
    }

    const saleDate = new Date(`${date}T00:00:00.000Z`);
    const sales = await prisma.sale.findMany({
      where: { saleDate },
      orderBy: [{ cashierNumber: "asc" }, { shift: "asc" }],
      include: {
        employee: { select: { name: true } },
        enteredByUser: { select: { name: true } }
      }
    });

    return ok(
      sales.map((sale) => ({
        id: sale.id,
        cashActual: sale.cashActual.toFixed(3),
        totalElecActual: sale.totalElecActual.toFixed(3),
        diffTotal: sale.diffTotal.toFixed(3),
        shift: sale.shift,
        entryTime: sale.entryTime,
        cashierNumber: sale.cashierNumber,
        createdAt: sale.createdAt.toISOString(),
        employee: sale.employee,
        enteredByUser: sale.enteredByUser
      }))
    );
  } catch (error) {
    return handleApiError(error);
  }
}
