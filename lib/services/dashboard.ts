import { cacheRemember } from "@/lib/cache";
import { prisma } from "@/lib/db/prisma";
import { listBoxBalancesForPeriod } from "@/lib/services/box-balances";
import { getMonthlyReport } from "@/lib/services/reports";

export async function getDashboardSummary(month: number, year: number) {
  return cacheRemember(`dashboard:${year}:${month}`, 300, async () => {
    const [monthly, recentSales, recentExpenses, balances] = await Promise.all([
      getMonthlyReport(month, year),
      prisma.sale.findMany({
        where: { month, year },
        include: {
          employee: {
            select: { name: true }
          },
          enteredByUser: {
            select: { name: true }
          }
        },
        orderBy: { createdAt: "desc" },
        take: 5
      }),
      prisma.expense.findMany({
        where: { month, year },
        orderBy: { createdAt: "desc" },
        take: 5
      }),
      listBoxBalancesForPeriod(month, year)
    ]);

    return {
      month,
      year,
      salesCount: recentSales.length,
      totalNetSystem: monthly.totals.totalNetSystem,
      totalActual: monthly.totals.totalActual,
      diffTotal: monthly.totals.diffTotal,
      totals: monthly.totals,
      kpis: monthly.kpis,
      weeklySeries: monthly.weekly.map((row) => ({
        week: row.week,
        totalNetSystem: Number(row.totalNetSystem),
        totalActual: Number(row.totalActual)
      })),
      paymentMix: [
        { name: "كاش", value: Number(monthly.totals.cashActual) },
        { name: "إلكتروني", value: Number(monthly.totals.elecActual) }
      ].filter((item) => item.value > 0),
      boxes: balances,
      recentSales: recentSales.map((sale) => ({
        id: sale.id,
        saleDate: sale.saleDate.toISOString().slice(0, 10),
        cashierNumber: sale.cashierNumber,
        shift: sale.shift,
        totalActual: sale.totalActual.toFixed(3),
        employeeName: sale.employee.name,
        enteredByName: sale.enteredByUser?.name ?? null
      })),
      recentExpenses: recentExpenses.map((expense) => ({
        id: expense.id,
        expenseDate: expense.expenseDate.toISOString().slice(0, 10),
        category: expense.category,
        amount: expense.amount.toFixed(3),
        status: expense.status
      }))
    };
  });
}
