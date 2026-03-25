import { Prisma } from "@prisma/client";

import { cacheRemember } from "@/lib/cache";
import { money, normalizeMoney } from "@/lib/calculations/money";
import { prisma } from "@/lib/db/prisma";

const reportMoneyKeys = [
  "cashSystem",
  "elecSystem",
  "returns",
  "totalNetSystem",
  "cashActual",
  "elecActual",
  "totalActual",
  "diffCash",
  "diffElec",
  "diffTotal",
  "companySettlement",
  "internalSpend",
  "totalExpenses",
  "finalNetSystem",
  "finalNetActual",
  "finalDiff"
] as const;

type ReportMoneyKey = (typeof reportMoneyKeys)[number];

type MoneyCell = string;

type RawDailyReportRow = {
  day: number;
} & Record<ReportMoneyKey, Prisma.Decimal | string | number>;

type DailyReportRow = {
  day: number;
} & Record<ReportMoneyKey, MoneyCell>;

type WeeklyReportRow = {
  week: string;
} & Record<ReportMoneyKey, MoneyCell>;

function formatMoneyCell(value: Prisma.Decimal | string | number | null | undefined) {
  return normalizeMoney(value ?? 0);
}

function sumRows<T extends Record<string, unknown>>(rows: T[], key: keyof T) {
  return normalizeMoney(rows.reduce((accumulator, row) => accumulator.plus(money(row[key] as string | number | Prisma.Decimal | null | undefined)), money(0)));
}

function buildTotals(rows: DailyReportRow[]) {
  return Object.fromEntries(reportMoneyKeys.map((key) => [key, sumRows(rows, key)])) as Record<ReportMoneyKey, MoneyCell>;
}

function getExtremes(rows: DailyReportRow[]) {
  let highestDay: { day: number; totalActual: string } | null = null;
  let lowestDay: { day: number; totalActual: string } | null = null;

  for (const row of rows) {
    if (!highestDay || money(row.totalActual).greaterThan(highestDay.totalActual)) {
      highestDay = {
        day: row.day,
        totalActual: row.totalActual
      };
    }

    if (!lowestDay || money(row.totalActual).lessThan(lowestDay.totalActual)) {
      lowestDay = {
        day: row.day,
        totalActual: row.totalActual
      };
    }
  }

  return { highestDay, lowestDay };
}

function buildWeeklyRows(daily: DailyReportRow[]) {
  const ranges = [
    { label: "الأسبوع الأول", start: 1, end: 7 },
    { label: "الأسبوع الثاني", start: 8, end: 14 },
    { label: "الأسبوع الثالث", start: 15, end: 21 },
    { label: "الأسبوع الرابع", start: 22, end: 31 }
  ];

  return ranges.map<WeeklyReportRow>((range) => {
    const rows = daily.filter((day) => day.day >= range.start && day.day <= range.end);

    return {
      week: range.label,
      cashSystem: sumRows(rows, "cashSystem"),
      elecSystem: sumRows(rows, "elecSystem"),
      returns: sumRows(rows, "returns"),
      totalNetSystem: sumRows(rows, "totalNetSystem"),
      cashActual: sumRows(rows, "cashActual"),
      elecActual: sumRows(rows, "elecActual"),
      totalActual: sumRows(rows, "totalActual"),
      diffCash: sumRows(rows, "diffCash"),
      diffElec: sumRows(rows, "diffElec"),
      diffTotal: sumRows(rows, "diffTotal"),
      companySettlement: sumRows(rows, "companySettlement"),
      internalSpend: sumRows(rows, "internalSpend"),
      totalExpenses: sumRows(rows, "totalExpenses"),
      finalNetSystem: sumRows(rows, "finalNetSystem"),
      finalNetActual: sumRows(rows, "finalNetActual"),
      finalDiff: sumRows(rows, "finalDiff")
    };
  });
}

export async function getDailyReport(month: number, year: number) {
  return cacheRemember(`reports:daily:${year}:${month}`, 300, async () => {
    const monthSettings = await prisma.monthlySetting.findFirst({
      where: { month, year }
    });

    const daysInMonth = monthSettings?.daysInMonth ?? new Date(Date.UTC(year, month, 0)).getUTCDate();

    const rows = await prisma.$queryRaw<RawDailyReportRow[]>(Prisma.sql`
      WITH days AS (
        SELECT generate_series(1, ${daysInMonth})::int AS day
      ),
      sales_agg AS (
        SELECT
          day_number AS day,
          COALESCE(SUM(cash_system), 0) AS "cashSystem",
          COALESCE(SUM(total_elec_system), 0) AS "elecSystem",
          COALESCE(SUM(returns), 0) AS "returns",
          COALESCE(SUM(total_net_system), 0) AS "totalNetSystem",
          COALESCE(SUM(cash_actual), 0) AS "cashActual",
          COALESCE(SUM(total_elec_actual), 0) AS "elecActual",
          COALESCE(SUM(total_actual), 0) AS "totalActual",
          COALESCE(SUM(diff_cash), 0) AS "diffCash",
          COALESCE(SUM(diff_elec), 0) AS "diffElec",
          COALESCE(SUM(diff_total), 0) AS "diffTotal"
        FROM sales
        WHERE month = ${month} AND year = ${year}
        GROUP BY day_number
      ),
      expense_agg AS (
        SELECT
          e.day_number AS day,
          COALESCE(SUM(CASE WHEN COALESCE(c.is_company_settlement, false) THEN e.amount ELSE 0 END), 0) AS "companySettlement",
          COALESCE(SUM(e.amount), 0) AS "totalExpenses"
        FROM expenses e
        LEFT JOIN expense_categories c ON c.name = e.category
        WHERE e.month = ${month} AND e.year = ${year}
        GROUP BY e.day_number
      )
      SELECT
        d.day,
        COALESCE(s."cashSystem", 0) AS "cashSystem",
        COALESCE(s."elecSystem", 0) AS "elecSystem",
        COALESCE(s."returns", 0) AS "returns",
        COALESCE(s."totalNetSystem", 0) AS "totalNetSystem",
        COALESCE(s."cashActual", 0) AS "cashActual",
        COALESCE(s."elecActual", 0) AS "elecActual",
        COALESCE(s."totalActual", 0) AS "totalActual",
        COALESCE(s."diffCash", 0) AS "diffCash",
        COALESCE(s."diffElec", 0) AS "diffElec",
        COALESCE(s."diffTotal", 0) AS "diffTotal",
        COALESCE(e."companySettlement", 0) AS "companySettlement",
        COALESCE(e."totalExpenses", 0) - COALESCE(e."companySettlement", 0) AS "internalSpend",
        COALESCE(e."totalExpenses", 0) AS "totalExpenses",
        COALESCE(s."totalNetSystem", 0) - COALESCE(e."totalExpenses", 0) AS "finalNetSystem",
        COALESCE(s."totalActual", 0) - COALESCE(e."totalExpenses", 0) AS "finalNetActual",
        (COALESCE(s."totalActual", 0) - COALESCE(e."totalExpenses", 0))
          - (COALESCE(s."totalNetSystem", 0) - COALESCE(e."totalExpenses", 0)) AS "finalDiff"
      FROM days d
      LEFT JOIN sales_agg s ON s.day = d.day
      LEFT JOIN expense_agg e ON e.day = d.day
      ORDER BY d.day ASC
    `);

    return rows.map<DailyReportRow>((row) => ({
      day: row.day,
      cashSystem: formatMoneyCell(row.cashSystem),
      elecSystem: formatMoneyCell(row.elecSystem),
      returns: formatMoneyCell(row.returns),
      totalNetSystem: formatMoneyCell(row.totalNetSystem),
      cashActual: formatMoneyCell(row.cashActual),
      elecActual: formatMoneyCell(row.elecActual),
      totalActual: formatMoneyCell(row.totalActual),
      diffCash: formatMoneyCell(row.diffCash),
      diffElec: formatMoneyCell(row.diffElec),
      diffTotal: formatMoneyCell(row.diffTotal),
      companySettlement: formatMoneyCell(row.companySettlement),
      internalSpend: formatMoneyCell(row.internalSpend),
      totalExpenses: formatMoneyCell(row.totalExpenses),
      finalNetSystem: formatMoneyCell(row.finalNetSystem),
      finalNetActual: formatMoneyCell(row.finalNetActual),
      finalDiff: formatMoneyCell(row.finalDiff)
    }));
  });
}

export async function getWeeklyReport(month: number, year: number, dailyData?: Awaited<ReturnType<typeof getDailyReport>>) {
  return cacheRemember(`reports:weekly:${year}:${month}`, 300, async () => buildWeeklyRows(dailyData ?? (await getDailyReport(month, year))));
}

export async function getMonthlyReport(month: number, year: number) {
  return cacheRemember(`reports:monthly:${year}:${month}`, 300, async () => {
    const [daily, boxes] = await Promise.all([
      getDailyReport(month, year),
      prisma.boxBalance.findMany({
        where: { month, year }
      })
    ]);

    const weekly = buildWeeklyRows(daily);
    const totals = buildTotals(daily);
    const { highestDay, lowestDay } = getExtremes(daily);
    const avgDaily = daily.length > 0 ? normalizeMoney(money(totals.totalActual).dividedBy(daily.length)) : "0.000";
    const margin = money(totals.totalNetSystem).greaterThan(0)
      ? normalizeMoney(money(totals.finalNetActual).dividedBy(totals.totalNetSystem).times(100))
      : "0.000";

    return {
      daily,
      weekly,
      totals,
      kpis: {
        highestDay,
        lowestDay,
        avgDaily,
        negativeDiffDays: daily.filter((day) => money(day.finalDiff).isNegative()).length,
        margin
      },
      boxes: boxes.map((box) => ({
        id: box.id,
        boxType: box.boxType,
        openingBalance: box.openingBalance.toFixed(3),
        incomeActual: box.incomeActual.toFixed(3),
        totalExpenses: box.totalExpenses.toFixed(3),
        transfersIn: box.transfersIn.toFixed(3),
        transfersOut: box.transfersOut.toFixed(3),
        calculatedBalance: box.calculatedBalance.toFixed(3),
        actualBalance: box.actualBalance?.toFixed(3) ?? null,
        difference: box.difference?.toFixed(3) ?? null
      }))
    };
  });
}

export async function getEmployeeReport(employeeId: string, month: number, year: number) {
  const sales = await prisma.sale.findMany({
    where: {
      employeeId,
      month,
      year
    },
    orderBy: [{ saleDate: "asc" }, { shift: "asc" }]
  });

  return sales.map((sale) => ({
    id: sale.id,
    saleDate: sale.saleDate.toISOString().slice(0, 10),
    shift: sale.shift,
    totalNetSystem: sale.totalNetSystem.toFixed(3),
    totalActual: sale.totalActual.toFixed(3),
    diffTotal: sale.diffTotal.toFixed(3)
  }));
}
