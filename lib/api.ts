import prisma from '@/lib/prisma';

// Helper to get current month and year
export const getCurrentMonthYear = () => {
  const date = new Date();
  return { month: date.getMonth() + 1, year: date.getFullYear() };
};

// --- Dashboard ---
export const getDashboardStats = async (month: number, year: number) => {
  const sales = await prisma.sale.findMany({
    where: { month, year }
  });
  
  const expenses = await prisma.expense.findMany({
    where: { month, year }
  });

  const totalNetSystem = sales.reduce((sum, sale) => sum + sale.netCashSystem.toNumber(), 0);
  const totalActual = sales.reduce((sum, sale) => sum + sale.totalActual.toNumber(), 0);
  const totalDifference = sales.reduce((sum, sale) => sum + sale.diffTotal.toNumber(), 0);
  const totalExpenses = expenses.reduce((sum, exp) => sum + exp.amount.toNumber(), 0);
  
  // Mock returns for now
  const totalReturns = 0;
  const netActualRevenue = totalActual - totalExpenses;

  return {
    totalNetSystem,
    totalActual,
    totalDifference,
    totalReturns,
    totalExpenses,
    netActualRevenue,
  };
};

export const getBoxBalances = async (month: number, year: number) => {
  const boxes = await prisma.boxBalance.findMany({
    where: { month, year }
  });
  
  // If no boxes exist, return default structure
  if (boxes.length === 0) {
    return [
      { type: 'cash', name: 'قاصة الكاش', balance: 0, actual: 0, diff: 0 },
      { type: 'master', name: 'ماستر كارد', balance: 0, actual: 0, diff: 0 },
      { type: 'swish', name: 'سويج', balance: 0, actual: 0, diff: 0 },
      { type: 'sagi', name: 'الساقي', balance: 0, actual: 0, diff: 0 },
      { type: 'other_elec', name: 'فيزا أخرى', balance: 0, actual: 0, diff: 0 },
      { type: 'bank', name: 'رصيد البنك', balance: 0, actual: 0, diff: 0 },
    ];
  }
  
  return boxes;
};

// --- Sales ---
export const getSales = async (month: number, year: number) => {
  return await prisma.sale.findMany({
    where: { month, year },
    include: { employee: true },
    orderBy: { saleDate: 'desc' }
  });
};

// --- Expenses ---
export const getExpenses = async (month: number, year: number) => {
  return await prisma.expense.findMany({
    where: { month, year },
    orderBy: { expenseDate: 'desc' }
  });
};

// --- Employees ---
export const getEmployees = async () => {
  return await prisma.employee.findMany({
    orderBy: { name: 'asc' }
  });
};

// --- Transfers ---
export const getTransfers = async (month: number, year: number) => {
  return await prisma.boxTransfer.findMany({
    where: { month, year },
    orderBy: { transferDate: 'desc' }
  });
};
