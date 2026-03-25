import { prisma } from "../lib/prisma.js";

function toDateUTC(year, month, day) {
  return new Date(Date.UTC(year, month - 1, day, 0, 0, 0));
}

function num(v) {
  if (v && typeof v.toNumber === "function") return v.toNumber();
  return Number(v ?? 0);
}

export async function getDailyReport({ month, year }) {
  const monthSettings = await prisma.monthlySetting.findFirst({ where: { month, year } });
  const daysInMonth = monthSettings?.daysInMonth ?? new Date(year, month, 0).getDate();

  // Fetch all sales and expenses for the month in 2 queries
  const allSales = await prisma.sale.findMany({
    where: { month, year }
  });
  const allExpenses = await prisma.expense.findMany({
    where: { month, year }
  });

  // Group by day for fast lookup
  const salesByDay = {};
  allSales.forEach(s => {
    const d = s.dayNumber;
    if (!salesByDay[d]) salesByDay[d] = [];
    salesByDay[d].push(s);
  });

  const expensesByDay = {};
  allExpenses.forEach(e => {
    const d = e.dayNumber;
    if (!expensesByDay[d]) expensesByDay[d] = [];
    expensesByDay[d].push(e);
  });

  const rows = [];
  for (let day = 1; day <= daysInMonth; day += 1) {
    const sales = salesByDay[day] || [];
    const expenses = expensesByDay[day] || [];

    const cashSystem = sales.reduce((a, s) => a + num(s.cashSystem), 0);
    const elecSystem = sales.reduce((a, s) => a + num(s.totalElecSystem), 0);
    const returns = sales.reduce((a, s) => a + num(s.returns), 0);
    const totalNetSystem = sales.reduce((a, s) => a + num(s.totalNetSystem), 0);

    const cashActual = sales.reduce((a, s) => a + num(s.cashActual), 0);
    const elecActual = sales.reduce((a, s) => a + num(s.totalElecActual), 0);
    const totalActual = sales.reduce((a, s) => a + num(s.totalActual), 0);

    const diffCash = sales.reduce((a, s) => a + num(s.diffCash), 0);
    const diffElec = sales.reduce((a, s) => a + num(s.diffElec), 0);
    const diffTotal = sales.reduce((a, s) => a + num(s.diffTotal), 0);

    const companySettlement = expenses
      .filter((e) => e.category.toLowerCase().includes("شركة"))
      .reduce((a, e) => a + num(e.amount), 0);
    const totalExpenses = expenses.reduce((a, e) => a + num(e.amount), 0);
    const internalSpend = totalExpenses - companySettlement;

    const finalNetSystem = totalNetSystem - totalExpenses;
    const finalNetActual = totalActual - totalExpenses;
    const finalDiff = finalNetActual - finalNetSystem;

    rows.push({
      day,
      cashSystem,
      elecSystem,
      returns,
      totalNetSystem,
      cashActual,
      elecActual,
      totalActual,
      diffCash,
      diffElec,
      diffTotal,
      companySettlement,
      internalSpend,
      finalNetSystem,
      finalNetActual,
      finalDiff
    });
  }

  return rows;
}

export async function getWeeklyReport({ month, year, dailyData = null }) {
  const daily = dailyData || (await getDailyReport({ month, year }));
  const ranges = [
    { label: "week1", start: 1, end: 7 },
    { label: "week2", start: 8, end: 14 },
    { label: "week3", start: 15, end: 21 },
    { label: "week4", start: 22, end: 31 }
  ];

  return ranges.map((r) => {
    const rows = daily.filter((d) => d.day >= r.start && d.day <= r.end);
    const sum = (key) => rows.reduce((a, x) => a + (x[key] ?? 0), 0);
    return {
      week: r.label,
      cashSystem: sum("cashSystem"),
      elecSystem: sum("elecSystem"),
      returns: sum("returns"),
      totalNetSystem: sum("totalNetSystem"),
      cashActual: sum("cashActual"),
      elecActual: sum("elecActual"),
      totalActual: sum("totalActual"),
      diffCash: sum("diffCash"),
      diffElec: sum("diffElec"),
      diffTotal: sum("diffTotal"),
      companySettlement: sum("companySettlement"),
      internalSpend: sum("internalSpend"),
      finalNetSystem: sum("finalNetSystem"),
      finalNetActual: sum("finalNetActual"),
      finalDiff: sum("finalDiff")
    };
  });
}

export async function getMonthlyReport({ month, year }) {
  const [daily, boxes] = await Promise.all([
    getDailyReport({ month, year }),
    prisma.boxBalance.findMany({ where: { month, year } })
  ]);
  const weekly = await getWeeklyReport({ month, year, dailyData: daily });

  const totals = daily.reduce(
    (acc, r) => {
      Object.keys(acc).forEach((k) => {
        acc[k] += r[k] || 0;
      });
      return acc;
    },
    {
      cashSystem: 0,
      elecSystem: 0,
      returns: 0,
      totalNetSystem: 0,
      cashActual: 0,
      elecActual: 0,
      totalActual: 0,
      diffCash: 0,
      diffElec: 0,
      diffTotal: 0,
      companySettlement: 0,
      internalSpend: 0,
      finalNetSystem: 0,
      finalNetActual: 0,
      finalDiff: 0
    }
  );

  const highestDay = [...daily].sort((a, b) => b.totalActual - a.totalActual)[0] || null;
  const lowestDay = [...daily].sort((a, b) => a.totalActual - b.totalActual)[0] || null;
  const avgDaily = daily.length ? totals.totalActual / daily.length : 0;
  const negativeDiffDays = daily.filter((d) => d.finalDiff < 0).length;
  const margin = totals.totalNetSystem > 0 ? (totals.finalNetActual / totals.totalNetSystem) * 100 : 0;

  return {
    daily,
    weekly,
    totals,
    kpis: {
      highestDay,
      lowestDay,
      avgDaily,
      negativeDiffDays,
      margin
    },
    boxes
  };
}

export async function getDashboard({ month, year }) {
  const [monthly, recentSales, recentExpenses] = await Promise.all([
    getMonthlyReport({ month, year }),
    prisma.sale.findMany({
      where: { month, year },
      orderBy: { createdAt: "desc" },
      take: 5
    }),
    prisma.expense.findMany({
      where: { month, year },
      orderBy: { createdAt: "desc" },
      take: 5
    })
  ]);

  return {
    totals: monthly.totals,
    kpis: monthly.kpis,
    boxes: monthly.boxes,
    recentSales,
    recentExpenses,
    weeklySeries: monthly.weekly
  };
}

